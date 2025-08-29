import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        padding: "12px 16px",
        textAlign: "center",
        borderTop: "1px solid #e5e7eb",
        // fallbacks in case your CSS variables aren't defined
        color: "var(--muted, #6b7280)",
        background: "var(--card, #ffffff)",
      }}
    >
      © {year} Spiritualgram
    </footer>
  );
}
