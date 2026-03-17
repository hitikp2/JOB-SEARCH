import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───
const API = "http://localhost:3001/api";

// ─── THEME ───
const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  cardHover: "#222233",
  border: "#2a2a3a",
  borderFocus: "#6366f1",
  text: "#e8e8ef",
  textMuted: "#8888a0",
  textDim: "#5a5a72",
  accent: "#6366f1",
  accentSoft: "#6366f120",
  accentGlow: "#6366f140",
  green: "#22c55e",
  greenSoft: "#22c55e18",
  amber: "#f59e0b",
  amberSoft: "#f59e0b18",
  red: "#ef4444",
  redSoft: "#ef444418",
};

// ─── API HELPERS ───
async function api(path, opts = {}) {
  const token = localStorage.getItem("ja_token");
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── ICONS (inline SVG) ───
const Icons = {
  briefcase: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  ),
  target: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  upload: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  zap: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  chart: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  file: (
    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke={C.textDim} strokeWidth="1">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

// ─── PILL / TAG ───
function Tag({ children, color = C.accent }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>{children}</span>
  );
}

// ─── STAT CARD ───
function StatCard({ icon, label, value, color = C.accent }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "20px 22px", flex: 1, minWidth: 160,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

// ─── AUTH SCREEN ───
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
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
      const body = mode === "login" ? { email, password } : { email, password, phone };
      const data = await api(path, { method: "POST", body });
      localStorage.setItem("ja_token", data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", background: C.surface,
    border: `1px solid ${C.border}`, borderRadius: 10, color: C.text,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 50% 0%, ${C.accentSoft} 0%, ${C.bg} 60%)`,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <div style={{ width: 400, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: 16, background: C.accentSoft,
            border: `1px solid ${C.accentGlow}`, marginBottom: 16,
          }}>
            <span style={{ fontSize: 24 }}>🎯</span>
          </div>
          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>Job Agent</h1>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>AI-powered job matching, delivered daily</p>
        </div>

        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "10px 0", border: "none", borderRadius: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, textTransform: "capitalize", transition: "all 0.2s",
                  background: mode === m ? C.accent : "transparent",
                  color: mode === m ? "#fff" : C.textMuted,
                }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} onFocus={e => e.target.style.borderColor = C.borderFocus}
              onBlur={e => e.target.style.borderColor = C.border} />
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle} onFocus={e => e.target.style.borderColor = C.borderFocus}
              onBlur={e => e.target.style.borderColor = C.border} />
            {mode === "signup" && (
              <input placeholder="Phone (optional, for SMS alerts)" value={phone} onChange={e => setPhone(e.target.value)}
                style={inputStyle} onFocus={e => e.target.style.borderColor = C.borderFocus}
                onBlur={e => e.target.style.borderColor = C.border} />
            )}
          </div>

          {error && <p style={{ color: C.red, fontSize: 13, margin: "14px 0 0" }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", padding: 14, marginTop: 20, border: "none", borderRadius: 10,
              background: loading ? C.textDim : C.accent, color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
            }}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RESUME UPLOAD SCREEN ───
function ResumeUpload({ onComplete }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleExtract = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("/profile/resume", { method: "POST", body: { resume_text: text } });
      setResult(data.profile);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (result) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(ellipse at 50% 0%, ${C.greenSoft} 0%, ${C.bg} 60%)`,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}>
        <div style={{ maxWidth: 520, padding: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 56, height: 56, borderRadius: "50%", background: C.greenSoft,
              border: `2px solid ${C.green}40`, marginBottom: 16,
            }}>
              <span style={{ color: C.green }}>{Icons.check}</span>
            </div>
            <h2 style={{ color: C.text, margin: "0 0 6px", fontSize: 22 }}>Profile Extracted</h2>
            <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>AI analyzed your resume and built your job profile</p>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            {result.primary_roles?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Target Roles</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.primary_roles.map(r => <Tag key={r} color={C.accent}>{r}</Tag>)}
                </div>
              </div>
            )}
            {result.skills?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.skills.slice(0, 12).map(s => <Tag key={s} color={C.green}>{s}</Tag>)}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {result.seniority_level && <div><span style={{ fontSize: 11, color: C.textMuted }}>Level: </span><span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{result.seniority_level}</span></div>}
              {result.remote_preference && <div><span style={{ fontSize: 11, color: C.textMuted }}>Remote: </span><span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{result.remote_preference}</span></div>}
              {result.salary_expectation && <div><span style={{ fontSize: 11, color: C.textMuted }}>Salary: </span><span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{result.salary_expectation}</span></div>}
            </div>
          </div>

          <button onClick={onComplete} style={{
            width: "100%", padding: 14, marginTop: 20, border: "none", borderRadius: 10,
            background: C.accent, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 50% 0%, ${C.accentSoft} 0%, ${C.bg} 60%)`,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 560, width: "100%", padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ color: C.textDim, marginBottom: 12 }}>{Icons.file}</div>
          <h2 style={{ color: C.text, margin: "0 0 6px", fontSize: 22 }}>Upload Your Resume</h2>
          <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Paste your resume text below. AI will extract your profile once.</p>
        </div>

        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Paste your resume text here..."
          style={{
            width: "100%", minHeight: 240, padding: 18, background: C.card,
            border: `1px solid ${C.border}`, borderRadius: 14, color: C.text,
            fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none",
            fontFamily: "'DM Sans', -apple-system, sans-serif", boxSizing: "border-box",
          }}
        />

        {error && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</p>}

        <button onClick={handleExtract} disabled={loading || text.length < 50}
          style={{
            width: "100%", padding: 14, marginTop: 16, border: "none", borderRadius: 10,
            background: loading || text.length < 50 ? C.textDim : C.accent,
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading || text.length < 50 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {loading ? (
            <>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
              Analyzing resume...
            </>
          ) : (
            <>{Icons.zap} Extract Profile with AI</>
          )}
        </button>
        <p style={{ textAlign: "center", color: C.textDim, fontSize: 12, marginTop: 10 }}>
          AI runs once to save costs. You can edit your profile later.
        </p>
      </div>
    </div>
  );
}

// ─── JOB CARD ───
function JobCard({ job, score, summary }) {
  const [hovered, setHovered] = useState(false);

  const scoreColor = score >= 90 ? C.green : score >= 70 ? C.amber : C.textMuted;

  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? C.borderFocus : C.border}`,
        borderRadius: 14, padding: 20, transition: "all 0.2s", cursor: "pointer",
      }}
      onClick={() => job.url && window.open(job.url, "_blank")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: C.text }}>{job.title}</h3>
          <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
            {job.company}{job.company && job.location ? " · " : ""}{job.location}
          </p>
        </div>
        {score && (
          <div style={{
            padding: "4px 10px", borderRadius: 8,
            background: `${scoreColor}18`, border: `1px solid ${scoreColor}30`,
            fontSize: 12, fontWeight: 700, color: scoreColor,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {score}%
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {job.salary && <Tag color={C.green}>{job.salary}</Tag>}
        {job.location?.toLowerCase().includes("remote") && <Tag color={C.accent}>Remote</Tag>}
      </div>

      {summary && (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{summary}</p>
      )}
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("matches");
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ total_matches: 0, today_matches: 0, notifications_sent: 0, avg_score: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s, p] = await Promise.all([
        api("/matches").catch(() => ({ matches: [] })),
        api("/matches/stats").catch(() => ({ total_matches: 0, today_matches: 0, notifications_sent: 0, avg_score: 0 })),
        api("/profile").catch(() => null),
      ]);
      setMatches(m.matches || []);
      setStats(s);
      setProfile(p);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const navItems = [
    { id: "matches", icon: Icons.target, label: "Matches" },
    { id: "profile", icon: Icons.user, label: "Profile" },
    { id: "settings", icon: Icons.bell, label: "Settings" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: `1px solid ${C.border}`, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
        background: `${C.surface}cc`, backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Job Agent</span>
          <Tag color={C.green}>Active</Tag>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                border: "none", borderRadius: 8, cursor: "pointer",
                background: tab === item.id ? C.accentSoft : "transparent",
                color: tab === item.id ? C.accent : C.textMuted,
                fontSize: 13, fontWeight: 500, transition: "all 0.2s",
              }}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8,
          color: C.textMuted, fontSize: 12, cursor: "pointer",
        }}>
          {Icons.logout} Sign Out
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        {/* ── Stats Row ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard icon={Icons.target} label="Total Matches" value={stats.total_matches} color={C.accent} />
          <StatCard icon={Icons.zap} label="Today" value={stats.today_matches} color={C.amber} />
          <StatCard icon={Icons.bell} label="Alerts Sent" value={stats.notifications_sent} color={C.green} />
          <StatCard icon={Icons.chart} label="Avg Score" value={`${stats.avg_score}%`} color={C.accent} />
        </div>

        {/* ── Tab Content ── */}
        {tab === "matches" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Recent Matches</h2>
              <span style={{ fontSize: 12, color: C.textMuted }}>Updated 3x daily</span>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>Loading matches...</div>
            ) : matches.length === 0 ? (
              <div style={{
                textAlign: "center", padding: 60, background: C.card,
                border: `1px solid ${C.border}`, borderRadius: 16,
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <h3 style={{ margin: "0 0 6px", color: C.text }}>No matches yet</h3>
                <p style={{ color: C.textMuted, fontSize: 14 }}>Your agent is searching. Matches appear after the next scan.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {matches.map(m => (
                  <JobCard
                    key={m.id}
                    job={m.jobs || {}}
                    score={m.score}
                    summary={m.ai_summary}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profile" && profile && (
          <div>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 600 }}>Your Profile</h2>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Target Roles</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(profile.primary_roles || []).map(r => <Tag key={r} color={C.accent}>{r}</Tag>)}
                  {(!profile.primary_roles || profile.primary_roles.length === 0) && <span style={{ color: C.textDim, fontSize: 13 }}>Not set</span>}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(profile.skills || []).map(s => <Tag key={s} color={C.green}>{s}</Tag>)}
                  {(!profile.skills || profile.skills.length === 0) && <span style={{ color: C.textDim, fontSize: 13 }}>Not set</span>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Seniority</div>
                  <div style={{ color: C.text, fontSize: 14 }}>{profile.seniority_level || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Remote</div>
                  <div style={{ color: C.text, fontSize: 14 }}>{profile.remote_preference || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Salary Target</div>
                  <div style={{ color: C.text, fontSize: 14 }}>{profile.salary_expectation || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Locations</div>
                  <div style={{ color: C.text, fontSize: 14 }}>{(profile.preferred_locations || []).join(", ") || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 600 }}>Notification Settings</h2>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Delivery Method</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["email", "sms", "both"].map(m => (
                    <button key={m} onClick={async () => {
                      await api("/profile", { method: "PATCH", body: { notification_method: m } });
                      setProfile(prev => ({ ...prev, notification_method: m }));
                    }}
                      style={{
                        padding: "10px 20px", border: `1px solid ${profile?.notification_method === m ? C.accent : C.border}`,
                        borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500,
                        background: profile?.notification_method === m ? C.accentSoft : "transparent",
                        color: profile?.notification_method === m ? C.accent : C.textMuted,
                        textTransform: "capitalize",
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: 18, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {Icons.zap}
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Agent Schedule</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
                  Your agent scans for new jobs at <strong style={{ color: C.text }}>8:00 AM</strong>, <strong style={{ color: C.text }}>1:00 PM</strong>, and <strong style={{ color: C.text }}>6:00 PM</strong> UTC daily. Top 3 matches are sent as a summary.
                </p>
              </div>

              <div style={{ marginTop: 20, padding: 18, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Cost Transparency</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  <div><span style={{ color: C.textMuted }}>AI calls/day:</span> <span style={{ color: C.text, fontWeight: 600 }}>~3</span></div>
                  <div><span style={{ color: C.textMuted }}>Est. monthly:</span> <span style={{ color: C.green, fontWeight: 600 }}>~$0.10/user</span></div>
                  <div><span style={{ color: C.textMuted }}>Jobs scanned:</span> <span style={{ color: C.text, fontWeight: 600 }}>100+/day</span></div>
                  <div><span style={{ color: C.textMuted }}>Matches/alert:</span> <span style={{ color: C.text, fontWeight: 600 }}>Top 3</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        ::selection { background: ${C.accentGlow}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: ${C.borderFocus} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
    </div>
  );
}

// ─── APP ROOT ───
export default function App() {
  const [user, setUser] = useState(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ja_token");
    if (!token) { setChecking(false); return; }
    api("/profile")
      .then(p => {
        setUser(p);
        if (!p.profile_complete) setNeedsResume(true);
      })
      .catch(() => localStorage.removeItem("ja_token"))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg, color: C.textMuted, fontFamily: "'DM Sans', sans-serif",
    }}>Loading...</div>
  );

  if (!user) return <AuthScreen onAuth={u => { setUser(u); setNeedsResume(true); }} />;
  if (needsResume) return <ResumeUpload onComplete={() => setNeedsResume(false)} />;

  return (
    <Dashboard user={user} onLogout={() => {
      localStorage.removeItem("ja_token");
      setUser(null);
      setNeedsResume(false);
    }} />
  );
}
