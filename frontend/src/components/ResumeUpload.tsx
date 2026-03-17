"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Icons } from "./Icons";
import { Tag } from "./Tag";
import type { Profile } from "@/lib/types";

export function ResumeUpload({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Profile | null>(null);

  const handleExtract = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api<{ profile: Profile }>("/profile/resume", {
        method: "POST",
        body: { resume_text: text },
      });
      setResult(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  if (result) {
    return (
      <div
        className="animate-fade-in"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(ellipse at 50% 0%, ${theme.greenSoft} 0%, ${theme.bg} 60%)`,
        }}
      >
        <div style={{ maxWidth: 520, padding: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: theme.greenSoft,
                border: `2px solid ${theme.green}40`,
                marginBottom: 16,
              }}
            >
              <span style={{ color: theme.green }}>{Icons.check}</span>
            </div>
            <h2
              style={{ color: theme.text, margin: "0 0 6px", fontSize: 22 }}
            >
              Profile Extracted
            </h2>
            <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
              AI analyzed your resume and built your job profile
            </p>
          </div>

          <div
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            {result.primary_roles && result.primary_roles.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  Target Roles
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                >
                  {result.primary_roles.map((r) => (
                    <Tag key={r} color={theme.accent}>
                      {r}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            {result.skills && result.skills.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  Skills
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                >
                  {result.skills.slice(0, 12).map((s) => (
                    <Tag key={s} color={theme.green}>
                      {s}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            <div
              style={{ display: "flex", gap: 16, flexWrap: "wrap" }}
            >
              {result.seniority_level && (
                <div>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>
                    Level:{" "}
                  </span>
                  <span
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {result.seniority_level}
                  </span>
                </div>
              )}
              {result.remote_preference && (
                <div>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>
                    Remote:{" "}
                  </span>
                  <span
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {result.remote_preference}
                  </span>
                </div>
              )}
              {result.salary_expectation && (
                <div>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>
                    Salary:{" "}
                  </span>
                  <span
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {result.salary_expectation}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onComplete}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 20,
              border: "none",
              borderRadius: 10,
              background: theme.accent,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Dashboard &rarr;
          </button>
        </div>
      </div>
    );
  }

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
      <div style={{ maxWidth: 560, width: "100%", padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ color: theme.textDim, marginBottom: 12 }}>
            {Icons.file}
          </div>
          <h2
            style={{ color: theme.text, margin: "0 0 6px", fontSize: 22 }}
          >
            Upload Your Resume
          </h2>
          <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
            Paste your resume text below. AI will extract your profile once.
          </p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your resume text here..."
          style={{
            width: "100%",
            minHeight: 240,
            padding: 18,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 14,
            color: theme.text,
            fontSize: 13,
            lineHeight: 1.7,
            resize: "vertical",
            outline: "none",
            fontFamily: "var(--font-sans)",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <p style={{ color: theme.red, fontSize: 13, marginTop: 10 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleExtract}
          disabled={loading || text.length < 50}
          style={{
            width: "100%",
            padding: 14,
            marginTop: 16,
            border: "none",
            borderRadius: 10,
            background:
              loading || text.length < 50 ? theme.textDim : theme.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor:
              loading || text.length < 50 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <span className="animate-spin-slow" style={{ display: "inline-block" }}>
                &#9881;
              </span>
              Analyzing resume...
            </>
          ) : (
            <>
              {Icons.zap} Extract Profile with AI
            </>
          )}
        </button>
        <p
          style={{
            textAlign: "center",
            color: theme.textDim,
            fontSize: 12,
            marginTop: 10,
          }}
        >
          AI runs once to save costs. You can edit your profile later.
        </p>
      </div>
    </div>
  );
}
