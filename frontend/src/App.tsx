import { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import Dashboard from "./components/Dashboard";

async function apiFetch(path: string, init?: RequestInit) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) throw new Error("VITE_API_BASE_URL is not set");

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

export default function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [traffic, setTraffic] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setEmail(u?.email ?? null);
      setTraffic([]);
      setErr(null);
    });
  }, []);

  async function login() {
    setErr(null);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    setErr(null);
    await signOut(auth);
  }

  async function loadTraffic() {
    setErr(null);
    const res = await apiFetch("/traffic");
    if (!res.ok) {
      const text = await res.text();
      setErr(text);
      return;
    }
    const data = await res.json();
    setTraffic(data);
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Cortex Job Dashboard</h1>

      {!email ? (
        <>
          <p>Please log in.</p>
          <button onClick={login}>Login with Google</button>
        </>
      ) : (
        <>
          <Dashboard />
        </>
      )}
    </div>
  );
}