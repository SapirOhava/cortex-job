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
- `firebase emulators:start --only functions,firestore --import ./emulator-data --export-on-exit`
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




// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARr61hJ-LHXAget3qtqAkuBWMWpEuD4ow",
  authDomain: "cortex-job-dashboard.firebaseapp.com",
  projectId: "cortex-job-dashboard",
  storageBucket: "cortex-job-dashboard.firebasestorage.app",
  messagingSenderId: "422188453614",
  appId: "1:422188453614:web:a34e197dc96fe46703adff",
  measurementId: "G-LMY3E20N0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);