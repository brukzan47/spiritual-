import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buildMediaSrc } from "../lib/media";
import { useTranslation } from "react-i18next";
// client/src/components/Navbar.jsx
import LanguageButton from "./LanguageButton";

// ...inside <nav className="navbar__links"> ...


export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("theme-smooth");
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);

  const onLogout = () => { logout(); nav("/login"); };
  const [avatarBroken, setAvatarBroken] = useState(false);
  const initials = (user?.username || "U").slice(0, 1).toUpperCase();
  const linkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

  const avatarSrc = useMemo(() => {
    if (!user?.avatarUrl) return null;
    const base = buildMediaSrc(user.avatarUrl);
    const ts = user?.updatedAt ? new Date(user.updatedAt).getTime() : Date.now();
    return `${base}${base.includes("?") ? "&" : "?"}t=${ts}`;
  }, [user?.avatarUrl, user?.updatedAt]);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">{t("brand")}</Link>

        <nav className="navbar__links">
      
            <LanguageButton variant="menu" />   

          <NavLink to="/" className={linkClass} end>{t("nav.feed")}</NavLink>
          {user && <NavLink to="/create" className={linkClass}>{t("nav.create")}</NavLink>}
          <NavLink to="/chat" className={linkClass}>{t("nav.chat")}</NavLink>
          

          {/* Theme toggle */}
          <button
            type="button"
            className="theme-toggle"
            title={dark ? "Switch to Light" : "Switch to Dark"}
            onClick={() => setDark(d => !d)}
          >
            {dark ? "🌙" : "☀️"} Theme
          </button>

          {/* Language switcher */}
          {/*<div style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
            <button className="btn btn--ghost" onClick={() => i18n.changeLanguage("en")}>EN</button>
            <button className="btn btn--ghost" onClick={() => i18n.changeLanguage("am")}>አማ</button>
            <button className="btn btn--ghost" onClick={() => i18n.changeLanguage("om")}>OM</button>
          </div>
*/}
          {user ? (
            <>
              {avatarSrc && !avatarBroken ? (
                <img
                  key={avatarSrc}
                  src={avatarSrc}
                  alt={user.username}
                  style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span className="nav-avatar" title={user?.username}>{initials}</span>
              )}
              <button className="btn btn--ghost" onClick={onLogout}>{t("nav.logout")}</button>
            </>
          ) : (
            <>
              <Link className="btn btn--ghost" to="/login">{t("nav.login")}</Link>
              <Link className="btn" to="/register">{t("nav.register")}</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
