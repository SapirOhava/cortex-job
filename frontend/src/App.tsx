import { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setEmail(u?.email ?? null);
      setErr(null);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  async function login() {
    try {
      setErr(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    }
  }

  async function logout() {
    try {
      setErr(null);
      await signOut(auth);
    } catch (e: any) {
      setErr(e?.message ?? "Logout failed");
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Cortex Job Dashboard</h1>

        {email ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, opacity: 0.8 }}>
              Signed in as <b>{email}</b>
            </span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : null}
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #f99", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {authLoading ? (
          <div>Checking auth…</div>
        ) : !email ? (
          <>
            <p>Please log in.</p>
            <button onClick={login}>Login with Google</button>
          </>
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}