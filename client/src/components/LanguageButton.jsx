import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "am", label: "አማ" }, // Amharic
  { code: "om", label: "OM" }  // Afan Oromo
];

export default function LanguageButton({
  variant = "menu",          // "menu" | "cycle"
  className = "",
  ghost = true               // use ghost style by default
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  // Close menu when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.closest) return;
      const root = btnRef.current.closest("[data-langbtn-root]");
      if (root && !root.contains(e.target)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  const changeTo = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const onCycle = () => {
    const idx = LANGS.findIndex(l => l.code === current.code);
    const next = LANGS[(idx + 1) % LANGS.length];
    changeTo(next.code);
  };

  if (variant === "cycle") {
    return (
      <button
        ref={btnRef}
        onClick={onCycle}
        className={`btn ${ghost ? "btn--ghost" : ""} ${className}`}
        title="Change language"
        aria-label="Change language"
      >
        {current.label}
      </button>
    );
  }

  // Menu variant
  return (
    <div data-langbtn-root style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={`btn ${ghost ? "btn--ghost" : ""} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Language"
      >
        {current.label} ▾
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="card"
          style={{
            position: "absolute",
            right: 0,
            marginTop: 6,
            minWidth: 140,
            zIndex: 100,
            padding: 6
          }}
        >
          {LANGS.map(l => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === current.code}
              onClick={() => changeTo(l.code)}
              className="btn btn--ghost"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                margin: "4px 0",
                borderColor: l.code === current.code ? "var(--brand)" : "var(--border)",
                color: l.code === current.code ? "var(--brand)" : "var(--fg)"
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
