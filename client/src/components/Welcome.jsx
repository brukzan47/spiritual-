// client/src/components/Welcome.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { welcomeCopy } from "../content/welcomeCopy";

export default function Welcome() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [name, setName] = useState(user?.username || "Friend");

  const langKey = (localStorage.getItem("lang") || "en").slice(0,2).toLowerCase();
  const t = welcomeCopy[langKey] || welcomeCopy.en;

  useEffect(() => {
    const flag = sessionStorage.getItem("showWelcome");
    const savedName = sessionStorage.getItem("welcomeName");
    if (flag === "1") {
      setName(savedName || user?.username || "Friend");
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        sessionStorage.removeItem("showWelcome");
        sessionStorage.removeItem("welcomeName");
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [user?.username]);

  if (!show) return null;

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <div className="welcome-badge">✨</div>
        <div className="welcome-title">{t.title(name)}</div>
        <div className="welcome-sub">{t.subtitle}</div>
        <div style={{ textAlign: "left", marginTop: 8 }}>
          {t.body.map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
          <a href="/" className="btn btn--ghost">{t.ctaPrimary}</a>
          <a href="/create" className="btn">{t.ctaSecondary}</a>
        </div>
      </div>
    </div>
  );
}
