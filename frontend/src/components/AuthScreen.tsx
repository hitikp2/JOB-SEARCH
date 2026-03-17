"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { User } from "@/lib/types";

export function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login" ? { email, password } : { email, password, phone };
      const data = await api<{ user: User; token: string }>(path, {
        method: "POST",
        body,
      });
      localStorage.setItem("ja_token", data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    color: theme.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse at 50% 0%, ${theme.accentSoft} 0%, ${theme.bg} 60%)`,
      }}
    >
      <div style={{ width: 400, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: theme.accentSoft,
              border: `1px solid ${theme.accentGlow}`,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 24 }}>&#127919;</span>
          </div>
          <h1
            style={{
              color: theme.text,
              fontSize: 26,
              fontWeight: 700,
              margin: "0 0 6px",
            }}
          >
            Job Agent
          </h1>
          <p
            style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}
          >
            AI-powered job matching, delivered daily
          </p>
        </div>

        <div
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 4,
              background: theme.surface,
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  background: mode === m ? theme.accent : "transparent",
                  color: mode === m ? "#fff" : theme.textMuted,
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = theme.borderFocus)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = theme.border)
              }
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = theme.borderFocus)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = theme.border)
              }
            />
            {mode === "signup" && (
              <input
                placeholder="Phone (optional, for SMS alerts)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderColor = theme.borderFocus)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = theme.border)
                }
              />
            )}
          </div>

          {error && (
            <p
              style={{
                color: theme.red,
                fontSize: 13,
                margin: "14px 0 0",
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 20,
              border: "none",
              borderRadius: 10,
              background: loading ? theme.textDim : theme.accent,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading
              ? "Processing..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
