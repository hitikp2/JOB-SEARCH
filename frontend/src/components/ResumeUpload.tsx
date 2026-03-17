"use client";

import { useState, useRef, useCallback } from "react";
import { api, apiUpload, trackActivity } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Icons } from "./Icons";
import { Tag } from "./Tag";
import type { Profile, TestResult } from "@/lib/types";

const ACCEPTED_TYPES = [
  "text/plain",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const ACCEPT_STRING = ".txt,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";

type UploadMode = "text" | "file";

export function ResumeUpload({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = useState<UploadMode>("file");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Profile | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await api<TestResult>("/profile/test");
      setTestResult(data);
    } catch {
      setTestResult({ database: false, ai: false, all_ok: false, timestamp: new Date().toISOString() });
    }
    setTesting(false);
  };

  const handleFileSelect = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(`Unsupported file type: ${f.type}. Use PDF, JPG, PNG, DOCX, or TXT.`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    setFile(f);
    setError("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleExtract = async () => {
    setError("");
    setLoading(true);
    try {
      let data: { profile: Profile };
      if (mode === "file" && file) {
        data = await apiUpload<{ profile: Profile }>("/profile/resume/upload", file);
      } else {
        data = await api<{ profile: Profile }>("/profile/resume", {
          method: "POST",
          body: { resume_text: text },
        });
      }
      setResult(data.profile);
      trackActivity("resume_extracted", { mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  const canSubmit = mode === "file" ? !!file && !loading : text.length >= 50 && !loading;

  // ── Success Screen ──
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
            <h2 style={{ color: theme.text, margin: "0 0 6px", fontSize: 22 }}>
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
                <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Target Roles
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.primary_roles.map((r) => (
                    <Tag key={r} color={theme.accent}>{r}</Tag>
                  ))}
                </div>
              </div>
            )}
            {result.skills && result.skills.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Skills
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.skills.slice(0, 12).map((s) => (
                    <Tag key={s} color={theme.green}>{s}</Tag>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {result.seniority_level && (
                <div>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>Level: </span>
                  <span style={{ color: theme.text, fontSize: 13, fontWeight: 600 }}>{result.seniority_level}</span>
                </div>
              )}
              {result.remote_preference && (
                <div>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>Remote: </span>
                  <span style={{ color: theme.text, fontSize: 13, fontWeight: 600 }}>{result.remote_preference}</span>
                </div>
              )}
              {result.salary_expectation && (
                <div>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>Salary: </span>
                  <span style={{ color: theme.text, fontSize: 13, fontWeight: 600 }}>{result.salary_expectation}</span>
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

  // ── Upload Screen ──
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
          <h2 style={{ color: theme.text, margin: "0 0 6px", fontSize: 22 }}>
            Upload Your Resume
          </h2>
          <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
            Upload a file or paste text. Supports PDF, JPG, PNG, DOCX, and TXT.
          </p>
        </div>

        {/* Mode Toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            background: theme.surface,
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(["file", "text"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: mode === m ? theme.card : "transparent",
                color: mode === m ? theme.text : theme.textDim,
                transition: "all 0.2s",
              }}
            >
              {m === "file" ? "Upload File" : "Paste Text"}
            </button>
          ))}
        </div>

        {/* File Upload Mode */}
        {mode === "file" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? theme.accent : theme.border}`,
              borderRadius: 14,
              padding: file ? 20 : 48,
              textAlign: "center",
              cursor: "pointer",
              background: dragActive ? theme.accentSoft : theme.card,
              transition: "all 0.2s",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_STRING}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: "none" }}
            />
            {file ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: theme.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: theme.accent }}>{Icons.check}</span>
                </div>
                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    {(file.size / 1024).toFixed(1)} KB &middot; {file.type.split("/")[1]?.toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  style={{
                    background: theme.redSoft,
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: theme.red,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div style={{ color: theme.accent, marginBottom: 12 }}>{Icons.upload}</div>
                <div style={{ color: theme.text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  Drag & drop your resume here
                </div>
                <div style={{ color: theme.textMuted, fontSize: 13 }}>
                  or click to browse &middot; PDF, JPG, PNG, DOCX, TXT
                </div>
                <div style={{ color: theme.textDim, fontSize: 11, marginTop: 8 }}>
                  Max 10MB
                </div>
              </>
            )}
          </div>
        )}

        {/* Text Mode */}
        {mode === "text" && (
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
        )}

        {error && (
          <p style={{ color: theme.red, fontSize: 13, marginTop: 10 }}>{error}</p>
        )}

        {/* Extract Button */}
        <button
          onClick={handleExtract}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: 14,
            marginTop: 16,
            border: "none",
            borderRadius: 10,
            background: !canSubmit ? theme.textDim : theme.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: !canSubmit ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <span className="animate-spin-slow" style={{ display: "inline-block" }}>&#9881;</span>
              {mode === "file" ? "Processing file..." : "Analyzing resume..."}
            </>
          ) : (
            <>
              {Icons.zap} Extract Profile with AI
            </>
          )}
        </button>

        {/* Test Connection Button */}
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 10,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            background: "transparent",
            color: theme.textMuted,
            fontSize: 13,
            fontWeight: 500,
            cursor: testing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {testing ? (
            <>
              <span className="animate-spin-slow" style={{ display: "inline-block" }}>&#9881;</span>
              Testing...
            </>
          ) : (
            <>
              {Icons.zap} Test Connection
            </>
          )}
        </button>

        {/* Test Results */}
        {testResult && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              background: testResult.all_ok ? theme.greenSoft : theme.redSoft,
              border: `1px solid ${testResult.all_ok ? theme.green : theme.red}30`,
              borderRadius: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: testResult.all_ok ? theme.green : theme.red }}>
                {testResult.all_ok ? Icons.check : "!"}
              </span>
              <span style={{ color: theme.text, fontSize: 14, fontWeight: 600 }}>
                {testResult.all_ok ? "All Systems Operational" : "Issues Detected"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: theme.textMuted }}>Database: </span>
                <span style={{ color: testResult.database ? theme.green : theme.red, fontWeight: 600 }}>
                  {testResult.database ? "Connected" : "Error"}
                </span>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>AI: </span>
                <span style={{ color: testResult.ai ? theme.green : theme.red, fontWeight: 600 }}>
                  {testResult.ai ? `Ready (${testResult.ai_provider})` : "Not configured"}
                </span>
              </div>
            </div>
          </div>
        )}

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
