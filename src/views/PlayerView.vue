<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ref as dbRef, onValue, set, get, serverTimestamp } from 'firebase/database'
import { db, ensureAuth, serverNow, connected } from '../firebase'
import { CARS, rank } from '../game'
import Car from '../components/Car.vue'
import Confetti from '../components/Confetti.vue'

const props = defineProps({ code: String })
const router = useRouter()
const room = ref((props.code || '').toUpperCase())
const codeInput = ref('')
const uid = ref(null)
const meta = ref(undefined) // undefined = loading, null = not found
const playersObj = ref({})
const qs = ref([])
const myAns = ref(null)
const name = ref(localStorage.getItem('ferrari_nick') || '')
const car = ref(0)
const error = ref('')
const busy = ref(false)
const now = ref(Date.now())
let offs = [], offAns = null, tick = null

const players = computed(() => Object.entries(playersObj.value || {}).map(([id, p]) => ({ id, ...p })))
const me = computed(() => playersObj.value?.[uid.value])
const ranked = computed(() => rank(players.value))
const myRank = computed(() => ranked.value.findIndex((p) => p.id === uid.value) + 1)
const q = computed(() => (meta.value && meta.value.qIndex >= 0 ? qs.value[meta.value.qIndex] : null))
const timeLeft = computed(() => (meta.value?.status === 'question' && meta.value.qStart
  ? Math.max(0, Math.ceil(meta.value.qTime - (now.value - meta.value.qStart) / 1000)) : 0))
const wasRight = computed(() => myAns.value && meta.value?.reveal && myAns.value.choice === meta.value.reveal.correct)
const iWon = computed(() => meta.value?.winner === uid.value)
const winnerName = computed(() => playersObj.value?.[meta.value?.winner]?.name)

async function connect() {
  error.value = ''
  try {
    const u = await ensureAuth(); uid.value = u.uid
    const s = await get(dbRef(db, `rooms/${room.value}/meta`))
    if (!s.exists()) { meta.value = null; return }
    offs.push(onValue(dbRef(db, `rooms/${room.value}/meta`), (x) => { meta.value = x.val() }))
    offs.push(onValue(dbRef(db, `rooms/${room.value}/players`), (x) => { playersObj.value = x.val() || {} }))
    offs.push(onValue(dbRef(db, `rooms/${room.value}/questions`), (x) => { qs.value = x.val() || [] }))
  } catch (e) { error.value = e.message; meta.value = null }
}

function enterCode() {
  room.value = codeInput.value.trim().toUpperCase()
  if (room.value.length === 4) { router.replace(`/play/${room.value}`); connect() }
}

async function join() {
  const n = name.value.trim()
  if (!n) { error.value = 'Enter a nickname'; return }
  if (players.value.length >= 30) { error.value = 'This race is full (30 drivers).'; return }
  busy.value = true; error.value = ''
  try {
    localStorage.setItem('ferrari_nick', n)
    const num = Math.max(0, ...players.value.map((p) => p.num || 0)) + 1
    await set(dbRef(db, `rooms/${room.value}/players/${uid.value}`), { name: n.slice(0, 16), car: car.value, num, pos: 0, ms: 0, joinedAt: serverTimestamp() })
  } catch (e) { error.value = 'Could not join (the race may have started).' } finally { busy.value = false }
}

async function choose(i) {
  if (myAns.value || timeLeft.value <= 0) return
  myAns.value = { choice: i } // instant feedback, confirmed by database
  try {
    await set(dbRef(db, `rooms/${room.value}/answers/${meta.value.qIndex}/${uid.value}`), { choice: i, t: serverTimestamp() })
  } catch (e) { /* duplicate or too late: the database refuses it */ }
}

// Restore my answer for the current question (also after a reconnect / page reload)
watch(() => [meta.value?.qIndex, uid.value], ([qi, u]) => {
  offAns?.(); myAns.value = null
  if (qi >= 0 && u) offAns = onValue(dbRef(db, `rooms/${room.value}/answers/${qi}/${u}`), (s) => { if (s.val()) myAns.value = s.val() })
})

onMounted(() => { tick = setInterval(() => { now.value = serverNow() }, 250); if (room.value) connect() })
onBeforeUnmount(() => { clearInterval(tick); offs.forEach((f) => f()); offAns?.() })
</script>

<template>
  <main class="player">
    <div v-if="!connected" class="offline">Connection lost… reconnecting</div>

    <!-- Enter code -->
    <section v-if="!room" class="page">
      <h1>Join a Race</h1>
      <input class="input code" v-model="codeInput" maxlength="4" placeholder="ROOM CODE" @keyup.enter="enterCode" />
      <button class="btn" @click="enterCode">Continue</button>
    </section>

    <section v-else-if="meta === undefined" class="page"><p class="muted">Connecting…</p></section>

    <section v-else-if="meta === null" class="page">
      <h1>Room not found</h1>
      <p class="muted">Check the code and try again.</p>
      <p v-if="error" class="err">{{ error }}</p>
      <RouterLink to="/play" class="btn" @click="room = ''">Back</RouterLink>
    </section>

    <!-- Join: nickname + car -->
    <section v-else-if="!me && meta.status === 'lobby'" class="page">
      <h2>Room {{ room }}</h2>
      <input class="input" v-model="name" maxlength="16" placeholder="Your nickname" />
      <p class="muted">Choose your Ferrari</p>
      <div class="cars">
        <button v-for="(c, i) in CARS" :key="i" class="carbtn" :class="{ on: car === i }" @click="car = i">
          <Car :color="c.color" :num="'?'" /><span>{{ c.name }}</span>
        </button>
      </div>
      <button class="btn" :disabled="busy" @click="join">Join the race</button>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section v-else-if="!me" class="page">
      <h1>Race already started</h1>
      <p class="muted">Wait for the next game.</p>
    </section>

    <!-- Waiting room -->
    <section v-else-if="meta.status === 'lobby'" class="page">
      <div class="mycar"><Car :color="CARS[me.car]?.color" :num="me.num" /></div>
      <h2>{{ me.name }}</h2>
      <p class="muted">You're in! Waiting for the host to start the race…</p>
      <p class="count">{{ players.length }} drivers on the grid</p>
    </section>

    <!-- Question -->
    <section v-else-if="meta.status === 'question' && q" class="page quiz">
      <div class="top"><span>Q{{ meta.qIndex + 1 }}/{{ meta.total }}</span><span class="time" :class="{ low: timeLeft <= 5 }">{{ timeLeft }}s</span></div>
      <h2 class="qt">{{ q.text }}</h2>
      <p style="font-size:12px;color:#ff0">timeLeft={{ timeLeft }} qStart={{ meta.qStart }} qTime={{ meta.qTime }} now={{ now }} myAns={{ myAns }}</p>
      <div class="answers">
        <button v-for="(o, i) in q.options" :key="i" class="ans" :class="['a' + i, { picked: myAns && myAns.choice === i, faded: myAns && myAns.choice !== i }]"
          :disabled="!!myAns || timeLeft <= 0" @click="choose(i)">
          <b>{{ ['▲', '◆', '●', '■'][i] }}</b> {{ o }}
        </button>
      </div>
      <p v-if="myAns" class="locked">✔ Answer submitted. Waiting for the others…</p>
      <p v-else-if="timeLeft <= 0" class="locked">Time's up!</p>
    </section>

    <!-- Result -->
    <section v-else-if="meta.status === 'reveal'" class="page">
      <h1 :class="wasRight ? 'good' : 'bad'">{{ wasRight ? 'Correct! 🏎️' : myAns ? 'Wrong ✘' : 'Too slow ⏱' }}</h1>
      <p v-if="wasRight">Your Ferrari moves forward!</p>
      <p v-else class="muted">Your car stays in place.</p>
      <p class="count">Position {{ me.pos }} / {{ meta.finish }} · Rank #{{ myRank }}</p>
      <p class="muted">Waiting for the next question…</p>
    </section>

    <!-- Finished -->
    <section v-else-if="meta.status === 'finished'" class="page">
      <Confetti v-if="iWon" />
      <h1 :class="iWon ? 'good' : ''">{{ iWon ? '🏆 YOU WON!' : 'Race finished' }}</h1>
      <p v-if="winnerName && !iWon">Winner: <b>{{ winnerName }}</b></p>
      <p class="count">Your rank: #{{ myRank }} of {{ players.length }}</p>
      <ol class="rank">
        <li v-for="(p, i) in ranked.slice(0, 10)" :key="p.id" :class="{ me: p.id === uid }">{{ i + 1 }}. {{ p.name }} <b>{{ p.pos || 0 }}</b></li>
      </ol>
    </section>

    <section v-else class="page"><p class="muted">Get ready…</p></section>
  </main>
</template>

<style scoped>
.player { min-height: 100vh; }
.page { max-width: 480px; margin: 0 auto; padding: 24px 18px; display: flex; flex-direction: column; gap: 14px; align-items: stretch; text-align: center; min-height: 100vh; justify-content: center; }
h1 { color: var(--red); font-size: 2rem; }
.code { text-align: center; font-family: var(--font-title); font-size: 2rem; letter-spacing: 8px; text-transform: uppercase; }
.offline { position: fixed; top: 0; left: 0; right: 0; background: var(--yellow); color: #000; text-align: center; font-weight: 700; padding: 6px; z-index: 99; }
.cars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.carbtn { background: #151515; border: 2px solid #333; border-radius: 10px; padding: 8px 4px; color: #fff; display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: var(--font-body); font-weight: 700; cursor: pointer; }
.carbtn :deep(.car) { height: 28px; }
.carbtn.on { border-color: var(--red); background: #2a0000; }
.mycar { height: 60px; display: flex; justify-content: center; }
.count { color: var(--yellow); font-weight: 700; }
.quiz { justify-content: flex-start; padding-top: 16px; }
.top { display: flex; justify-content: space-between; font-family: var(--font-title); }
.time { color: var(--yellow); font-size: 1.4rem; }
.time.low { color: var(--red); }
.qt { text-transform: none; font-size: 1.25rem; line-height: 1.3; }
.answers { display: grid; gap: 12px; margin-top: 6px; }
.ans { border: 0; border-radius: 14px; padding: 22px 14px; font-size: 1.25rem; font-weight: 700; color: #fff; font-family: var(--font-body); text-align: left; display: flex; gap: 12px; align-items: center; cursor: pointer; transition: transform .1s, opacity .2s; }
.ans:active:not(:disabled) { transform: scale(.97); }
.ans.a0 { background: #d6192b; } .ans.a1 { background: #1a5fd0; } .ans.a2 { background: #d89c00; } .ans.a3 { background: #14944a; }
.ans.picked { outline: 4px solid #fff; }
.ans.faded { opacity: .3; }
.locked { color: var(--yellow); font-weight: 700; }
.good { color: #1fd660; } .bad { color: #ff5a5a; }
.rank { list-style: none; text-align: left; }
.rank li { padding: 6px 10px; border-bottom: 1px solid #222; font-weight: 700; }
.rank li.me { background: #2a0000; border-radius: 6px; }
.rank b { float: right; color: var(--red); }
</style>
