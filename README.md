
# Cortex Job Dashboard

**Fullstack Developer Home Task — Interactive Dashboard with Firebase**

---

## 🌐 Live Deployed Application

Production URL:

https://cortex-job-dashboard.web.app

API Base:

https://cortex-job-dashboard.web.app/api

Health Check:

https://cortex-job-dashboard.web.app/api/health

---

## 📄 Assignment Document

See: docs/Fullstack home task.pdf

---

# Overview

This project is a fullstack web application built according to the assignment requirements.

### Tech Stack

- Frontend: React (Vite + TypeScript)
- Backend: Firebase Cloud Functions (Express API)
- Database: Firebase Firestore
- Authentication: Firebase Authentication (Google Sign-In)
- Charts: Recharts
- Hosting: Firebase Hosting

Architecture:

Frontend → Express API → Firestore

The frontend does not access Firestore directly. All data flows through a secured backend API.

---

# Features

## Core

- Traffic table (date → visits)
- Line chart visualization
- Sorting (ascending / descending)
- Cursor-based pagination
- Add / Edit / Delete entries
- Google Authentication
- Backend token verification

## Bonus

- Daily / Weekly / Monthly aggregation toggle
- Date range filtering
- Role-based access control (viewer / editor)
- Production deployment (Hosting + Functions)

---

# Firestore Structure

Collection: trafficStats

Document ID = YYYY-MM-DD

Example:

{
  "date": "2025-03-01",
  "visits": 120,
  "createdAt": timestamp,
  "updatedAt": timestamp
}

Role collection:

Collection: editors

Document ID = normalized email

If document exists → user is editor.

---

# API Endpoints

Base path: /api

GET    /api/health  
GET    /api/me  
GET    /api/traffic  
POST   /api/traffic  
PUT    /api/traffic/:id  
DELETE /api/traffic/:id  

Authentication header:

Authorization: Bearer <Firebase ID Token>

---

# Run Locally

Requirements:

- Node.js v18+
- Firebase CLI

Install CLI:

npm install -g firebase-tools

Login:

firebase login

Select project:

firebase use cortex-job-dashboard

---

Backend:

cd functions  
npm install  
npm run build  

---

Frontend:

cd frontend  
npm install  

Create frontend/.env.local and add:

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=cortex-job-dashboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cortex-job-dashboard
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

VITE_API_BASE_URL=http://127.0.0.1:5001/cortex-job-dashboard/us-central1/api

---

Start emulators (from root):

firebase emulators:start --only functions,firestore --import ./emulator-data --export-on-exit

---

Start frontend:

cd frontend  
npm run dev  

---

# Production Deployment

Build frontend:

cd frontend  
npm run build  

Build backend:

cd ../functions  
npm run build  

Deploy:

firebase deploy --only functions,hosting

---

Production URL:

https://cortex-job-dashboard.web.app

---

# Summary

This project demonstrates:

- Secure frontend/backend separation
- Firebase Auth with server-side verification
- Role-based access control
- Firestore transactional writes
- Cursor-based pagination
- Data aggregation (daily / weekly / monthly)
- Production-ready Firebase deployment
