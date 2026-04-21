/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import HeaderMenu from "./components/layout/HeaderMenu";
import CallManager from "./components/call/CallManager";
import ProfileSetup from "./components/ProfileSetup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import WorldChat from "./pages/WorldChat";
import Calls from "./pages/Calls";
import SplashScreen from "./components/SplashScreen";

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile) {
    return <ProfileSetup />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Navbar />
      <HeaderMenu />
      <CallManager />
      <main className="flex-1 max-w-7xl mx-auto w-full relative overflow-y-auto lg:pl-20 pb-20 lg:pb-0">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/world" element={<WorldChat />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

