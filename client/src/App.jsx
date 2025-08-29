// client/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Welcome from "./components/Welcome";   // 👈 add this
import Search from "./pages/Search";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import AuthProvider, { useAuth } from "./contexts/AuthContext";
import UserProfile from "./pages/UserProfile";


function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="max-w-xl mx-auto p-4">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Welcome />
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-6 flex-1">
          <Routes>
  
           <Route path="/search" element={<Search />} />
            
            <Route path="/" element={<Feed />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/create" element={<PrivateRoute><CreatePost /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
            
  
        <Route path="/u/:id" element={<UserProfile />} />

          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
