import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!username || !email || !password) {
      setErr("Please fill in username, email, and password.");
      return;
    }
    try {
      setLoading(true);
      await register({ username, email, password }); // ✅ exact names
      nav("/");
    } catch (e) {
      setErr(e?.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-bold mb-3">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-sm" style={{ color: "red" }}>{err}</div>}
        <button className="btn w-full" disabled={loading}>{loading ? "Creating…" : "Register"}</button>
      </form>
      <div className="mt-3 text-sm">
        Already have an account? <Link to="/login" className="hover:underline">Login</Link>
      </div>
    </div>
  );
}
