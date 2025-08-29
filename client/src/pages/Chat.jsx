import React, { useEffect, useMemo, useRef, useState } from "react";
import api, { serverOrigin } from "../api";
import { useAuth } from "../contexts/AuthContext";



//const { data } = await api.get(`/users`, { params: { q: query } });
//setUsers(data.users || []);

/* ---------- Media with fallback (proxy first, then direct URL) ---------- */
function ChatMedia({ msg }) {
  const primary = `${serverOrigin}/api/chat/messages/${msg._id}/media`;
  const list = useMemo(() => {
    const arr = [primary];
    if (msg.mediaUrl) arr.push(msg.mediaUrl);   // fallback to whatever is stored
    return arr;
  }, [primary, msg.mediaUrl]);
  // client/src/pages/Chat.jsx
 


  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [msg._id, msg.mediaUrl]);

  const src = list[i] || "";
  const tryNext = () => { if (i < list.length - 1) setI(i + 1); };

  if (!src) return null;

  if (msg.mediaType === "audio") {
    return <audio src={src} controls className="chat-audio" onError={tryNext} />;
  }
  // default to image
  return (
    <img
      src={src}
      alt="img"
      className="chat-media"
      onError={(e) => {
        const prev = i;
        tryNext();
        // if we ran out of fallbacks, mark visually
        if (prev === i) {
          e.currentTarget.alt = "image not found";
          e.currentTarget.style.opacity = 0.3;
        }
      }}
    />
  );
}

export default function Chat() {
  const { user } = useAuth();
  const me = user?._id || null;

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [file, setFile] = useState(null); // image/audio
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [busy, setBusy] = useState(false);

  const endRef = useRef(null);

  const loadUsers = async (query = "") => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get(`/chat/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      setUsers(data.users || []);
    } finally { setLoadingUsers(false); }
  };
  useEffect(() => { loadUsers(); }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const openConversationWith = async (userId) => {
    try {
      setBusy(true);
      const { data } = await api.post("/chat/conversations", { userId });
      setConversation(data.conversation);
      await loadMessages(data.conversation._id);
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to open conversation");
    } finally { setBusy(false); }
  };

  const loadMessages = async (convoId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/chat/conversations/${convoId}/messages`);
      setMessages(data.messages || []);
    } finally { setLoadingMsgs(false); }
  };

  useEffect(() => {
    if (!conversation?._id) return;
    const id = setInterval(() => loadMessages(conversation._id), 3000);
    return () => clearInterval(id);
  }, [conversation?._id]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!conversation?._id) return;
    const txt = text.trim();
    if (!txt && !file) return;

    try {
      setBusy(true);
      const form = new FormData();
      if (txt) form.append("text", txt);
      if (file) form.append("media", file); // server expects "media"
      const { data } = await api.post(`/chat/conversations/${conversation._id}/messages`, form);
      setMessages(m => [...m, data.message]);
      setText("");
      setFile(null);
    } catch (e2) {
      alert(e2?.response?.data?.error || "Failed to send");
    } finally { setBusy(false); }
  };

  const peer = useMemo(() => {
    if (!conversation || !me) return null;
    return (conversation.participants || []).find(u => String(u._id) !== String(me)) || null;
  }, [conversation, me]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Users */}
      <div className="card">
        <div className="font-semibold mb-2">Users</div>
        <form onSubmit={(e)=>{e.preventDefault(); loadUsers(q);}} className="flex gap-2 mb-2">
          <input className="input" placeholder="Search users…" value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className="btn">Search</button>
        </form>
        {loadingUsers ? (
          <div className="text-sm" style={{ color:"var(--muted)" }}>Loading…</div>
        ) : (
          <ul className="divide-y" style={{ borderColor:"var(--border)" }}>
            {users.map(u => (
              <li key={u._id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt={u.username}
                      style={{ width: 32, height: 32, borderRadius: "50%", objectFit:"cover", border:"1px solid var(--border)" }}
                      onError={(e)=>{e.currentTarget.style.display="none";}}
                    />
                  ) : (
                    <div className="nav-avatar">{(u.username || "U").slice(0,1).toUpperCase()}</div>
                  )}
                  <div className="font-medium">{u.username}</div>
                </div>
                <button className="btn" onClick={()=>openConversationWith(u._id)} disabled={busy}>Chat</button>
              </li>
            ))}
            {!users.length && <div className="text-sm" style={{ color:"var(--muted)" }}>No users</div>}
          </ul>
        )}
      </div>

      {/* Messages */}
      <div className="md:col-span-2 card flex flex-col">
        <div className="font-semibold mb-2">
          {peer ? `Chat with ${peer.username}` : "Pick a user to start"}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 320 }}>
          {loadingMsgs && conversation && <div className="text-sm" style={{ color:"var(--muted)" }}>Loading messages…</div>}
          <ul className="space-y-2">
            {messages.map(m => {
              const mine = String(m.sender?._id || m.sender) === String(me);
              return (
                <li key={m._id} className={`max-w-[80%] ${mine ? "ml-auto" : ""}`}>
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: mine ? "var(--brand)" : "var(--card)",
                      color: mine ? "#fff" : "var(--fg)",
                      border: mine ? "none" : "1px solid var(--border)"
                    }}
                  >
                    {/* ✅ media first with fallback */}
                    {m.mediaType && <ChatMedia msg={m} />}

                    {m.text && <div className="text-sm mt-1">{m.text}</div>}
                    <div className="text-[10px] opacity-80 mt-1">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </li>
              );
            })}
            <div ref={endRef} />
          </ul>
        </div>

        <form onSubmit={send} className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder={conversation ? "Type a message…" : "Select a user first"}
              value={text}
              onChange={(e)=>setText(e.target.value)}
              disabled={!conversation || busy}
            />
            <button className="btn" disabled={!conversation || busy || (!text.trim() && !file)}>Send</button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*,audio/*"
              onChange={(e)=>setFile(e.target.files?.[0] || null)}
              disabled={!conversation || busy}
            />
            {file && <span className="text-sm" style={{ color:"var(--muted)" }}>{file.name}</span>}
          </div>
          {!!file && file.type.startsWith("image/") && (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              style={{ width:"100%", maxHeight:240, objectFit:"cover", borderRadius:12 }}
            />
          )}
          {!!file && file.type.startsWith("audio/") && (
            <audio src={URL.createObjectURL(file)} controls style={{ width:"100%" }} />
          )}
        </form>
      </div>
    </div>
  );
}
