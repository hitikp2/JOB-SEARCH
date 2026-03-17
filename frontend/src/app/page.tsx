"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { User, Profile } from "@/lib/types";
import { AuthScreen } from "@/components/AuthScreen";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Dashboard } from "@/components/Dashboard";
import { theme } from "@/lib/theme";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ja_token");
    if (!token) {
      setChecking(false);
      return;
    }
    api<Profile>("/profile")
      .then((p) => {
        setUser(p);
        if (!p.profile_complete) setNeedsResume(true);
      })
      .catch(() => localStorage.removeItem("ja_token"))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div
        className="animate-fade-in"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.bg,
          color: theme.textMuted,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onAuth={(u) => {
          setUser(u);
          setNeedsResume(true);
        }}
      />
    );
  }

  if (needsResume) {
    return <ResumeUpload onComplete={() => setNeedsResume(false)} />;
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        localStorage.removeItem("ja_token");
        setUser(null);
        setNeedsResume(false);
      }}
    />
  );
}
