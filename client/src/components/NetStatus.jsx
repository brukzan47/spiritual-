// client/src/components/NetStatus.jsx
import React, { useEffect, useState } from "react";

export default function NetStatus() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return (
    <span style={{ fontSize: 12, opacity: 0.8 }}>
      {on ? "🟢 Online" : "🔴 Offline"}
    </span>
  );
}
