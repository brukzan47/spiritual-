// client/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // load from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (token && u) {
      try { setUser(JSON.parse(u)); } catch {}
    }
    setLoading(false);
  }, []);

  /*const saveAuth = (token, userObj) => {
    if (token) localStorage.setItem("token", token);
    if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
    setUser(userObj || null);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const register = async (username, email, password) => {
    const { data } = await api.post("/auth/register", { username, email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };*/
  // client/src/contexts/AuthContext.jsx
const saveAuth = (token, userObj) => {
  if (token) localStorage.setItem("token", token);
  if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
  setUser(userObj || null);
};

const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  saveAuth(data.token, data.user);
  // 👇 tell the app to show Welcome after this login
  localStorage.setItem("welcome_after_login", "1");
  return data.user;
};

const register = async (username, email, password) => {
  const { data } = await api.post("/auth/register", { username, email, password });
  saveAuth(data.token, data.user);
  // 👇 also show Welcome after registration
  localStorage.setItem("welcome_after_login", "1");
  return data.user;
};


  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const refreshMe = async () => {
    const { data } = await api.get("/users/me");
    saveAuth(localStorage.getItem("token"), data.user);
    return data.user;
  };

/*  const updateAvatar = async (file) => {
    const form = new FormData();
    form.append("avatar", file);     // 🔑 server expects "avatar"
    const { data } = await api.put("/users/me/avatar", form);
    saveAuth(localStorage.getItem("token"), data.user);
    return data.user;
  };*/
  const updateAvatar = async (file) => {
  const form = new FormData();
  form.append("avatar", file);                 // 🔑 field name must be "avatar"
  const { data } = await api.put("/users/me/avatar", form);

  // Write to state + localStorage so UI updates immediately
  setUser(prev => {
    const next = { ...(prev || {}), ...data.user, updatedAt: Date.now() }; // bump for cache-bust
    localStorage.setItem("user", JSON.stringify(next));
    return next;
  });

  return data.user;
};


  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}
