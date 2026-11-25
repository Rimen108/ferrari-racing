import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref as dbRef, onValue } from 'firebase/database'
import { getAuth, signInAnonymously } from 'firebase/auth'

const env = import.meta.env
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const db = getDatabase(app)
export const auth = getAuth(app)

// Anonymous login: each phone/browser gets a secure unique id (uid)
export async function ensureAuth() {
  await auth.authStateReady()
  if (!auth.currentUser) await signInAnonymously(auth)
  return auth.currentUser
}

// Server clock (so every phone and the laptop share the same timer)
let offset = 0
export const connected = ref(true)
onValue(dbRef(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0 })
onValue(dbRef(db, '.info/connected'), (s) => { connected.value = !!s.val() })
export const serverNow = () => Date.now() + offset
