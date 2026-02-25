# Commands (Firebase Dashboard Project)

## 0) Folder meanings
- `cortexJob/` = Firebase workspace (config + deploy + emulators)
- `cortexJob/functions/` = Backend Node project (Cloud Functions code + npm)
- `cortexJob/frontend/` = Frontend React project (later)

---

## 1) Login & project init (one time)
From `cortexJob/`:
- `firebase login`
  - Logs CLI into your Google/Firebase account
- `firebase init`
  - Select: Firestore + Functions
  - Choose project
  - Choose Firestore region (eur3)
  - Choose Functions: TypeScript + ESLint + install deps

---

## 2) Backend dependencies (Express + CORS)
From `cortexJob/functions/`:
- `npm i express cors`
- `npm i -D @types/express @types/cors`

---

## 3) Build functions (TypeScript -> JavaScript)
From `cortexJob/functions/`:
- `npm run build`
  - Creates `functions/lib/index.js` which emulator/deploy uses

---

## 4) Start emulators (local development)
From `cortexJob/`:
- `firebase emulators:start --only firestore,functions`
  - Starts local Firestore DB (port 8080)
  - Starts local Functions API (port 5001)
  - UI at http://127.0.0.1:4000

---

## 5) Seed Firestore emulator (recommended dev)
Terminal A (keep running):
From `cortexJob/`:
- `firebase emulators:start --only firestore`

Terminal B:
From `cortexJob/functions/`:
- `npm run seed:emulator`
  - Writes sample data into the local Firestore emulator

Check data in UI:
- http://127.0.0.1:4000/firestore

---

## 6) Seed production Firestore (only when ready)
From `cortexJob/functions/`:
- `npm run seed:prod`
  - Writes sample data into REAL Firestore in Google Cloud

---

## 7) Deploy (bonus)
From `cortexJob/`:
- `firebase deploy --only functions,firestore`
  - Deploys Cloud Functions backend + Firestore rules/indexes

(Optional) Deploy everything:
- `firebase deploy`