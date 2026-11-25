# Ferrari Racing – The Ultimate Quiz

Vue 3 + Firebase Realtime Database. Host on laptop/projector, ~30 players on phones.

## 1. Firebase (free, 5 minutes)
1. https://console.firebase.google.com → Add project (disable Google Analytics).
2. Build → Authentication → Get started → Sign-in method → enable **Anonymous**.
3. Build → Realtime Database → Create database → choose a location → start in **locked mode**.
4. Realtime Database → **Rules** tab → delete everything, paste the content of `database.rules.json` → **Publish**.
5. Project settings (gear) → General → "Your apps" → Web app (`</>`) → register → copy the config values.
6. Copy `.env.example` to `.env` and fill it:
   - VITE_FIREBASE_DATABASE_URL = the URL shown at the top of the Realtime Database page (https://xxxx-default-rtdb.firebaseio.com or ...europe-west1.firebasedatabase.app)

## 2. Run locally
```
npm install
npm run dev
```
Open http://localhost:5173/host on the laptop. For phones on the same Wi-Fi, open the "Network" address shown in the terminal on the host page and type it in the "address" box above the QR code (example: http://192.168.1.20:5173) so the QR code points to it.

## 3. Deploy on Vercel (free)
1. Put the project on GitHub (`.env` is ignored, it will NOT be uploaded).
2. https://vercel.com → Add New Project → import the repo (Framework: Vite).
3. Settings → Environment Variables → add the 5 `VITE_FIREBASE_*` values → Deploy.
4. Firebase → Authentication → Settings → Authorized domains → add your `xxx.vercel.app` domain.
5. Open `https://xxx.vercel.app/host`: the QR code now works from any phone.

## How the game works
- Players sign in anonymously, write only their own answer (once per question, only while the question is open).
- Only the host (matching hostUid in the rules) changes questions, status and car positions.
- Correct answers are stored in `keys/` which only the host can read.
- Finish line = number of questions. Winner = first to finish; ties use the earliest answer time. If nobody completes, the best score wins.
