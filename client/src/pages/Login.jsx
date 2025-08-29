import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
// ...

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!identifier || !password) {
      setErr("Please enter your email/username and password.");
      return;
    }
    try {
      setLoading(true);
      // Our AuthContext.login can accept (identifier, password)
      await login(identifier, password);
      nav("/");
    } catch (e) {
      setErr(e?.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-bold mb-3">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          placeholder="Email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <div className="text-sm" style={{ color: "red" }}>{err}</div>}
        <button className="btn w-full" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
      <div className="mt-3 text-sm">
        No account? <Link to="/register" className="hover:underline">Register</Link>
      </div>
    </div>
  );
}
