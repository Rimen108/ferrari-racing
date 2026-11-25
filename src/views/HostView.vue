<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ref as dbRef, onValue, set, get, update, serverTimestamp } from 'firebase/database'
import QRCode from 'qrcode'
import { db, ensureAuth, serverNow } from '../firebase'
import { CARS, DEFAULT_QUESTIONS, genCode, shuffle, rank } from '../game'
import RaceTrack from '../components/RaceTrack.vue'
import QuestionEditor from '../components/QuestionEditor.vue'
import Confetti from '../components/Confetti.vue'

const MAX_PLAYERS = 30
const uid = ref(null)
const code = ref('')
const meta = ref(null)
const playersObj = ref({})
const qs = ref([])
const answerCount = ref(0)
const busy = ref(false)
const error = ref('')
const now = ref(Date.now())
const qr = ref('')
const qTime = ref(20)
const baseUrl = ref(location.origin)
const showEditor = ref(false)
const questions = ref(JSON.parse(localStorage.getItem('ferrari_questions') || 'null') || structuredClone(DEFAULT_QUESTIONS))
watch(questions, (v) => localStorage.setItem('ferrari_questions', JSON.stringify(v)), { deep: true })

let offs = []
let tick = null
let offAnswers = null

const players = computed(() =>
  Object.entries(playersObj.value || {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => (a.num || 0) - (b.num || 0))
)
const ranked = computed(() => rank(players.value))
const joinUrl = computed(() => `${baseUrl.value.replace(/\/$/, '')}/play/${code.value}`)
const status = computed(() => meta.value?.status)
const currentQ = computed(() => (meta.value && meta.value.qIndex >= 0 ? qs.value[meta.value.qIndex] : null))
const timeLeft = computed(() => {
  if (status.value !== 'question' || !meta.value.qStart) return 0
  return Math.max(0, Math.ceil(meta.value.qTime - (now.value - meta.value.qStart) / 1000))
})
const winner = computed(() => players.value.find((p) => p.id === meta.value?.winner))
const questionsOk = computed(() => questions.value.length > 0 && questions.value.every((q) => q.text.trim() && q.options.every((o) => o.trim())))

watch(joinUrl, async () => {
  if (code.value) qr.value = await QRCode.toDataURL(joinUrl.value, { width: 360, margin: 1 })
}, { immediate: true })

watch(timeLeft, (t) => { if (t === 0 && status.value === 'question') reveal() })
watch(answerCount, (n) => {
  if (status.value === 'question' && players.value.length && n >= players.value.length) setTimeout(reveal, 700)
})
watch(() => [code.value, meta.value?.qIndex], ([c, q]) => {
  offAnswers?.(); answerCount.value = 0
  if (c && q >= 0) offAnswers = onValue(dbRef(db, `rooms/${c}/answers/${q}`), (s) => { answerCount.value = Object.keys(s.val() || {}).length })
})

function subscribe() {
  const c = code.value
  offs.forEach((f) => f()); offs = []
  offs.push(onValue(dbRef(db, `rooms/${c}/meta`), (s) => { meta.value = s.val() }))
  offs.push(onValue(dbRef(db, `rooms/${c}/players`), (s) => { playersObj.value = s.val() || {} }))
  offs.push(onValue(dbRef(db, `rooms/${c}/questions`), (s) => { qs.value = s.val() || [] }))
}

async function createGame() {
  busy.value = true; error.value = ''
  try {
    const u = await ensureAuth(); uid.value = u.uid
    let c, snap
    do { c = genCode(); snap = await get(dbRef(db, `rooms/${c}/meta`)) } while (snap.exists())
    await set(dbRef(db, `rooms/${c}/meta`), { hostUid: u.uid, status: 'lobby', qIndex: -1, qTime: 20, createdAt: serverTimestamp() })
    code.value = c
    localStorage.setItem('ferrari_host_room', c)
    subscribe()
  } catch (e) { error.value = 'Could not create the game: ' + e.message } finally { busy.value = false }
}

async function startRace() {
  busy.value = true; error.value = ''
  try {
    const c = code.value
    const built = questions.value.map((q) => {
      const opts = shuffle(q.options.map((t, i) => ({ t, ok: i === q.correct })))
      return { text: q.text, options: opts.map((o) => o.t), correct: opts.findIndex((o) => o.ok) }
    })
    await set(dbRef(db, `rooms/${c}/questions`), built.map((b) => ({ text: b.text, options: b.options })))
    await set(dbRef(db, `rooms/${c}/keys`), built.map((b) => b.correct))
    await update(dbRef(db, `rooms/${c}/meta`), {
      status: 'question', qIndex: 0, qStart: serverTimestamp(), qTime: Math.max(5, Number(qTime.value) || 20),
      total: built.length, finish: built.length, reveal: null, winner: null,
    })
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

// Host grades the question: only the host writes positions
async function reveal() {
  if (busy.value || status.value !== 'question') return
  busy.value = true
  try {
    const c = code.value, m = meta.value, q = m.qIndex
    const [aS, kS] = await Promise.all([get(dbRef(db, `rooms/${c}/answers/${q}`)), get(dbRef(db, `rooms/${c}/keys/${q}`))])
    const correct = kS.val(), ans = aS.val() || {}
    const up = {}, next = [], finishers = []
    let right = 0, wrong = 0
    for (const p of players.value) {
      const a = ans[p.id]
      let pos = p.pos || 0, ms = p.ms || 0
      if (a) {
        if (a.choice === correct) {
          right++; pos++; ms += Math.max(0, a.t - m.qStart)
          up[`players/${p.id}/pos`] = pos
          up[`players/${p.id}/ms`] = ms
          if (pos >= m.finish) finishers.push({ id: p.id, t: a.t })
        } else wrong++
      }
      next.push({ id: p.id, pos, ms })
    }
    const last = q + 1 >= m.total
    let win = null
    if (finishers.length) win = finishers.sort((a, b) => a.t - b.t)[0].id // earliest submission wins
    else if (last) { const r = rank(next)[0]; if (r && r.pos > 0) win = r.id }
    up['meta/status'] = finishers.length || last ? 'finished' : 'reveal'
    up['meta/reveal'] = { q, correct, right, wrong, none: players.value.length - right - wrong }
    up['meta/winner'] = win
    await update(dbRef(db, `rooms/${c}`), up)
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

async function nextQuestion() {
  await update(dbRef(db, `rooms/${code.value}/meta`), { status: 'question', qIndex: meta.value.qIndex + 1, qStart: serverTimestamp(), reveal: null, winner: null })
}

async function endRace() {
  const top = ranked.value[0]
  await update(dbRef(db, `rooms/${code.value}/meta`), { status: 'finished', winner: top && top.pos > 0 ? top.id : null })
}

function newGame() {
  offs.forEach((f) => f()); offs = []
  localStorage.removeItem('ferrari_host_room')
  code.value = ''; meta.value = null; playersObj.value = {}; qs.value = []
}

onMounted(async () => {
  tick = setInterval(() => { now.value = serverNow() }, 250)
  const saved = localStorage.getItem('ferrari_host_room')
  if (saved) {
    try {
      const u = await ensureAuth(); uid.value = u.uid
      const s = await get(dbRef(db, `rooms/${saved}/meta`))
      if (s.exists() && s.val().hostUid === u.uid) { code.value = saved; subscribe() }
      else localStorage.removeItem('ferrari_host_room')
    } catch (e) { error.value = e.message }
  }
})
onBeforeUnmount(() => { clearInterval(tick); offs.forEach((f) => f()); offAnswers?.() })
</script>

<template>
  <main class="host">
    <!-- 1. No room yet -->
    <section v-if="!code" class="center">
      <h1>Host Dashboard</h1>
      <p class="muted">Create a room, show the QR code, and let the race begin.</p>
      <div class="row">
        <button class="btn" :disabled="busy" @click="createGame">Create Game</button>
        <RouterLink to="/" class="btn secondary">Back</RouterLink>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section v-else-if="!meta" class="center"><p class="muted">Loading…</p></section>

    <!-- 2. Lobby -->
    <section v-else-if="status === 'lobby'" class="lobby">
      <div class="card join">
        <p class="muted">Room code</p>
        <div class="code">{{ code }}</div>
        <img v-if="qr" :src="qr" alt="QR code" class="qr" />
        <p class="muted small">Scan to join, or open:</p>
        <input class="input" v-model="baseUrl" title="Public site address (change it if you run locally)" />
        <p class="url">{{ joinUrl }}</p>
      </div>

      <div class="card plist">
        <h2>Drivers <span class="count">{{ players.length }} / {{ MAX_PLAYERS }}</span></h2>
        <div class="grid">
          <div v-for="p in players" :key="p.id" class="chip">
            <i :style="{ background: CARS[p.car]?.color }"></i> #{{ p.num }} {{ p.name }}
          </div>
          <p v-if="!players.length" class="muted">Waiting for players to join…</p>
        </div>
      </div>

      <div class="card settings">
        <h2>Setup</h2>
        <label class="muted">Seconds per question</label>
        <input class="input" type="number" min="5" max="120" v-model="qTime" />
        <button class="btn secondary small mt" @click="showEditor = !showEditor">
          {{ showEditor ? 'Hide' : 'Edit' }} questions ({{ questions.length }})
        </button>
        <QuestionEditor v-if="showEditor" :questions="questions" />
        <p v-if="!questionsOk" class="err">Every question needs text and 4 options.</p>
        <button class="btn mt" :disabled="busy || !players.length || !questionsOk" @click="startRace">Start Race</button>
        <p v-if="error" class="err">{{ error }}</p>
      </div>
    </section>

    <!-- 3. Race -->
    <section v-else class="race">
      <header class="bar">
        <h2>Ferrari Racing</h2>
        <span class="pill">Room {{ code }}</span>
        <span class="pill">Question {{ (meta.qIndex || 0) + 1 }} / {{ meta.total }}</span>
        <span class="pill">{{ players.length }} drivers</span>
        <span class="spacer"></span>
        <button v-if="status === 'question'" class="btn small" :disabled="busy" @click="reveal">Reveal answer</button>
        <button v-if="status === 'reveal'" class="btn small" @click="nextQuestion">Next Question</button>
        <button v-if="status !== 'finished'" class="btn small secondary" @click="endRace">End Race</button>
      </header>

      <div class="qpanel card" v-if="currentQ">
        <div class="qtext">
          <h2>{{ currentQ.text }}</h2>
          <div class="opts">
            <div v-for="(o, i) in currentQ.options" :key="i" class="opt"
              :class="{ ok: meta.reveal && meta.reveal.q === meta.qIndex && meta.reveal.correct === i, dim: meta.reveal && meta.reveal.q === meta.qIndex && meta.reveal.correct !== i }">
              <b>{{ 'ABCD'[i] }}</b> {{ o }}
            </div>
          </div>
        </div>
        <div class="side">
          <div v-if="status === 'question'" class="timer" :class="{ low: timeLeft <= 5 }">{{ timeLeft }}</div>
          <div v-if="status === 'question'" class="muted">Answered {{ answerCount }} / {{ players.length }}</div>
          <div v-if="meta.reveal && status !== 'question'" class="stats">
            <div class="good">✔ {{ meta.reveal.right }}</div>
            <div class="bad">✘ {{ meta.reveal.wrong }}</div>
            <div class="muted">no answer {{ meta.reveal.none }}</div>
          </div>
        </div>
      </div>

      <div class="main">
        <div class="trackwrap"><RaceTrack :players="players" :finish="meta.finish" /></div>
        <aside class="card board">
          <h3>Leaderboard</h3>
          <ol>
            <li v-for="(p, i) in ranked" :key="p.id">
              <span class="pos">{{ i + 1 }}</span>
              <i :style="{ background: CARS[p.car]?.color }"></i>
              <span class="nm">{{ p.name }}</span>
              <span class="sc">{{ p.pos || 0 }}/{{ meta.finish }}</span>
            </li>
          </ol>
        </aside>
      </div>

      <!-- Winner -->
      <div v-if="status === 'finished'" class="overlay">
        <Confetti />
        <div class="winner card">
          <p class="tag">🏁 Chequered flag 🏁</p>
          <h1>{{ winner ? winner.name : 'No winner' }}</h1>
          <p v-if="winner" class="muted">wins the Ferrari Racing Quiz!</p>
          <ol class="podium">
            <li v-for="(p, i) in ranked.slice(0, 5)" :key="p.id">{{ i + 1 }}. {{ p.name }} <b>{{ p.pos || 0 }}</b></li>
          </ol>
          <button class="btn" @click="newGame">New Game</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.host { min-height: 100vh; padding: 16px; }
.center { text-align: center; padding-top: 18vh; display: flex; flex-direction: column; gap: 18px; align-items: center; }
.center h1 { font-size: 3rem; color: var(--red); }
.row { display: flex; gap: 12px; }
.lobby { display: grid; grid-template-columns: 340px 1fr 380px; gap: 16px; align-items: start; }
@media (max-width: 1100px) { .lobby { grid-template-columns: 1fr; } }
.join { text-align: center; }
.code { font-family: var(--font-title); font-size: 4rem; font-weight: 900; color: var(--yellow); letter-spacing: 10px; }
.qr { width: 100%; max-width: 300px; border-radius: 10px; margin: 10px 0; background: #fff; }
.url { word-break: break-all; font-size: .9rem; color: var(--grey); margin-top: 6px; }
.small { font-size: .85rem; }
.count { color: var(--red); margin-left: 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; margin-top: 12px; }
.chip { background: #111; border-radius: 8px; padding: 8px 10px; font-weight: 700; display: flex; align-items: center; gap: 8px; animation: pop .3s; }
.chip i, .board i { width: 12px; height: 12px; border-radius: 50%; flex: none; border: 1px solid #fff5; }
@keyframes pop { from { transform: scale(.6); opacity: 0; } }
.mt { margin-top: 14px; }
.race { display: flex; flex-direction: column; gap: 12px; height: calc(100vh - 32px); min-height: 640px; }
.bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.bar h2 { color: var(--red); font-size: 1.2rem; }
.spacer { flex: 1; }
.pill { background: #1d1d1d; border: 1px solid #333; padding: 4px 12px; border-radius: 20px; font-weight: 700; }
.qpanel { display: flex; gap: 20px; padding: 12px 16px; }
.qtext { flex: 1; }
.qtext h2 { font-size: 1.25rem; text-transform: none; margin-bottom: 8px; }
.opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.opt { background: #151515; border: 2px solid #333; border-radius: 8px; padding: 8px 12px; font-weight: 700; font-size: 1.1rem; }
.opt b { color: var(--yellow); margin-right: 8px; }
.opt.ok { border-color: #1fd660; background: #0c3b1d; }
.opt.dim { opacity: .35; }
.side { width: 150px; text-align: center; }
.timer { font-family: var(--font-title); font-size: 3.4rem; font-weight: 900; color: var(--yellow); line-height: 1; }
.timer.low { color: var(--red); animation: pulse .5s infinite alternate; }
@keyframes pulse { to { transform: scale(1.15); } }
.stats { font-family: var(--font-title); font-size: 1.1rem; }
.good { color: #1fd660; } .bad { color: #ff5a5a; }
.main { flex: 1; display: grid; grid-template-columns: 1fr 300px; gap: 12px; min-height: 0; }
.trackwrap { min-height: 0; }
.board { overflow: auto; padding: 12px; }
.board h3 { margin-bottom: 8px; }
.board ol { list-style: none; }
.board li { display: flex; align-items: center; gap: 8px; padding: 3px 0; border-bottom: 1px solid #222; font-weight: 700; font-size: .95rem; }
.pos { width: 22px; color: var(--yellow); }
.nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc { color: var(--grey); }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.82); display: grid; place-items: center; z-index: 50; }
.winner { text-align: center; padding: 36px 56px; z-index: 70; background: #111; border: 2px solid var(--red); animation: pop .5s; }
.winner h1 { font-size: clamp(2.5rem, 7vw, 5rem); color: var(--yellow); margin: 10px 0; }
.tag { color: var(--yellow); letter-spacing: 4px; font-weight: 700; }
.podium { list-style: none; margin: 20px 0; font-size: 1.3rem; }
.podium b { color: var(--red); margin-left: 8px; }
</style>
