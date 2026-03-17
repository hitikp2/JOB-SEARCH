'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../lib/api';

// ─── SCORE RING ───
function ScoreRing({ score, size = 44 }) {
  const color = score >= 90 ? '#34d399' : score >= 80 ? '#a78bfa' : score >= 70 ? '#fbbf24' : '#6b7280';
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 110) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e2e" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color,
      }}>{score}</div>
    </div>
  );
}

// ─── TAG ───
function Tag({ children, color = '#a78bfa', ghost = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6,
      fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
      background: ghost ? 'transparent' : `${color}14`,
      color, border: `1px solid ${color}${ghost ? '40' : '25'}`,
    }}>{children}</span>
  );
}

// ─── TIME AGO ───
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── AUTH SCREEN ───
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup';
      const body = mode === 'login' ? { email, password } : { email, password, phone };
      const data = await api(path, { method: 'POST', body });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, var(--accent-soft) 0%, var(--bg) 60%)',
    }}>
      <div style={{ width: 400, padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #a78bfa20, #34d39920)',
            border: '1px solid var(--accent-glow)', marginBottom: 16,
          }}>
            <span style={{ fontSize: 24 }}>🎯</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Job Agent</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>AI-powered job matching, delivered daily</p>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input placeholder="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle} required />
            <input placeholder="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} required minLength={6} />
            {mode === 'signup' && (
              <input placeholder="Phone (optional, for SMS alerts)" value={phone}
                onChange={e => setPhone(e.target.value)} style={inputStyle} />
            )}
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 14, marginTop: 6, border: 'none', borderRadius: 10,
              background: loading ? 'var(--text-dim)' : 'var(--accent)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}>
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── RESUME UPLOAD ───
function ResumeUpload({ onComplete }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/profile/resume', { method: 'POST', body: { resume_text: text } });
      setResult(data.profile);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (result) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, var(--green-soft) 0%, var(--bg) 60%)',
      }}>
        <div style={{ maxWidth: 520, padding: '20px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-up">
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%', background: 'var(--green-soft)',
              border: '2px solid #34d39940', marginBottom: 16, fontSize: 24,
            }}>✓</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>Profile Extracted</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>AI analyzed your resume and built your job profile</p>
          </div>

          <div className="fade-up" style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24, animationDelay: '0.1s',
          }}>
            {result.primary_roles?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Target Roles</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.primary_roles.map(r => <Tag key={r} color="#a78bfa">{r}</Tag>)}
                </div>
              </div>
            )}
            {result.skills?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.skills.slice(0, 12).map(s => <Tag key={s} color="#34d399">{s}</Tag>)}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {result.seniority_level && <div><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Level: </span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.seniority_level}</span></div>}
              {result.remote_preference && <div><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Remote: </span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.remote_preference}</span></div>}
              {result.salary_expectation && <div><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Salary: </span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.salary_expectation}</span></div>}
            </div>
          </div>

          <button onClick={onComplete} className="fade-up" style={{
            width: '100%', padding: 14, marginTop: 20, border: 'none', borderRadius: 10,
            background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', animationDelay: '0.2s',
          }}>Go to Dashboard →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, var(--accent-soft) 0%, var(--bg) 60%)',
    }}>
      <div style={{ maxWidth: 560, width: '100%', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📄</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>Upload Your Resume</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Paste your resume text below. AI will extract your profile once.</p>
        </div>

        <form onSubmit={handleExtract}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Paste your resume text here..."
            style={{
              width: '100%', minHeight: 240, padding: 18, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)',
              fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none',
              fontFamily: "'Source Serif 4', serif", boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>{error}</p>}
          <button type="submit" disabled={loading || text.length < 50} style={{
            width: '100%', padding: 14, marginTop: 16, border: 'none', borderRadius: 10,
            background: loading || text.length < 50 ? 'var(--text-dim)' : 'var(--accent)',
            color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            cursor: loading || text.length < 50 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? '⚙️ Analyzing resume...' : '⚡ Extract Profile with AI'}
          </button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 10 }}>
          AI runs once to save costs. You can edit your profile later.
        </p>
      </div>
    </div>
  );
}

// ─── MATCH CARD ───
function MatchCard({ match }) {
  const [hovered, setHovered] = useState(false);
  const { job, score, ai_summary, created_at, sent } = match;
  const j = job || match.jobs || {};

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => j.url && window.open(j.url, '_blank')}
      style={{
        background: hovered ? 'var(--card-hover)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 30px rgba(167,139,250,0.06)' : 'none',
      }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <ScoreRing score={score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{j.title || 'Untitled'}</h3>
            {sent && <Tag color="#34d399">Sent</Tag>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3, fontFamily: "'Source Serif 4', serif" }}>
            {j.company}{j.company && j.location ? ' · ' : ''}{j.location}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {j.salary && <Tag color="#34d399">{j.salary}</Tag>}
            {j.location?.toLowerCase().includes('remote') && <Tag color="#60a5fa" ghost>Remote</Tag>}
            {created_at && <Tag color="#6b6b85" ghost>{timeAgo(created_at)}</Tag>}
          </div>
          {ai_summary && (
            <p style={{
              margin: '14px 0 0', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65,
              fontFamily: "'Source Serif 4', serif", fontStyle: 'italic',
            }}>{ai_summary}</p>
          )}
        </div>
        <div style={{
          opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
          color: 'var(--accent)', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        }}>Apply ↗</div>
      </div>
    </div>
  );
}

// ─── STAT CARD ───
function Stat({ label, value, sub, color = '#a78bfa' }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
      padding: '22px 20px', flex: 1, minWidth: 140, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: `${color}08`,
      }} />
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase',
        letterSpacing: 1.2, marginBottom: 10,
      }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ total_matches: 0, today_matches: 0, notifications_sent: 0, avg_score: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s, p] = await Promise.all([
        api('/matches').catch(() => ({ matches: [] })),
        api('/matches/stats').catch(() => ({ total_matches: 0, today_matches: 0, notifications_sent: 0, avg_score: 0 })),
        api('/profile').catch(() => null),
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
    { id: 'matches', label: 'Matches', icon: '🎯' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,18,0.85)', backdropFilter: 'blur(16px)',
        padding: '0 28px', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #a78bfa30, #34d39930)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>🎯</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>Job Agent</span>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
            boxShadow: '0 0 8px #34d39960', animation: 'pulse 2s ease-in-out infinite',
          }} />
        </div>
        <nav style={{ display: 'flex', gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 500, transition: 'all 0.2s', fontFamily: 'inherit',
                background: tab === item.id ? 'var(--accent-soft)' : 'transparent',
                color: tab === item.id ? 'var(--accent)' : 'var(--text-dim)',
              }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>Sign Out</button>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 920, margin: '0 auto', padding: '28px 20px 60px' }}>
        {/* MATCHES TAB */}
        {tab === 'matches' && (
          <>
            <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
              <Stat label="Total Matches" value={stats.total_matches} sub="All time" color="#a78bfa" />
              <Stat label="Today" value={stats.today_matches} sub="Next scan soon" color="#fbbf24" />
              <Stat label="Alerts Sent" value={stats.notifications_sent} color="#34d399" />
              <Stat label="Avg Score" value={`${stats.avg_score}%`} color="#60a5fa" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Recent Matches</h2>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', fontFamily: "'Source Serif 4', serif" }}>
                Updated 3x daily
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading matches...</div>
            ) : matches.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 60, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 16,
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <h3 style={{ margin: '0 0 6px' }}>No matches yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Your agent is searching. Matches appear after the next scan at 8:00 AM, 1:00 PM, or 6:00 PM UTC.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
          </>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && profile && (
          <div>
            <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600 }}>Your Profile</h2>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 28, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg, #a78bfa, #34d399, #60a5fa)',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700,
                  background: 'linear-gradient(135deg, #a78bfa20, #34d39920)',
                  border: '1px solid #a78bfa25', color: 'var(--accent)',
                }}>{(profile.email || '?')[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.email}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                    {profile.seniority_level || ''} · {profile.years_experience || 0} years · {profile.remote_preference || ''}
                  </div>
                </div>
              </div>

              {profile.primary_roles?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Target Roles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.primary_roles.map(r => <Tag key={r} color="#a78bfa">{r}</Tag>)}
                  </div>
                </div>
              )}

              {profile.skills?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.skills.map(s => <Tag key={s} color="#34d399">{s}</Tag>)}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PrefItem label="Salary" value={profile.salary_expectation} />
                <PrefItem label="Locations" value={(profile.preferred_locations || []).join(', ')} />
                <PrefItem label="Remote" value={profile.remote_preference} />
                <PrefItem label="Notifications" value={profile.notification_method} />
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600 }}>Settings</h2>

            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 28, marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Notification Method
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['email', 'sms', 'both'].map(m => (
                  <button key={m} onClick={async () => {
                    await api('/profile', { method: 'PATCH', body: { notification_method: m } });
                    setProfile(prev => ({ ...prev, notification_method: m }));
                  }} style={{
                    padding: '12px 24px', borderRadius: 10, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                    fontFamily: 'inherit', transition: 'all 0.25s',
                    background: profile?.notification_method === m ? 'var(--accent-soft)' : 'transparent',
                    color: profile?.notification_method === m ? 'var(--accent)' : 'var(--text-dim)',
                    border: `1px solid ${profile?.notification_method === m ? 'var(--accent-glow)' : 'var(--border)'}`,
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 28, marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Agent Schedule
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {['8:00 AM', '1:00 PM', '6:00 PM'].map((t, i) => (
                  <div key={t} style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{t}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {['Morning', 'Midday', 'Evening'][i]}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.6, fontFamily: "'Source Serif 4', serif" }}>
                Each scan fetches jobs, runs matching, AI summarizes top results, and sends your notification.
              </p>
            </div>

            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 28,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Cost Transparency
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'AI calls/day', value: '~3', color: '#a78bfa' },
                  { label: 'Est. monthly', value: '$0.10', color: '#34d399' },
                  { label: 'Jobs scanned', value: '100+', color: '#60a5fa' },
                  { label: 'Matches/alert', value: 'Top 3', color: '#fbbf24' },
                ].map(c => (
                  <div key={c.label} style={{
                    textAlign: 'center', padding: '14px 8px',
                    background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PrefItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: "'Source Serif 4', serif" }}>{value || '—'}</div>
    </div>
  );
}

// ─── APP ROOT ───
export default function Home() {
  const [user, setUser] = useState(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    api('/profile')
      .then(p => {
        setUser(p);
        if (!p.profile_complete) setNeedsResume(true);
      })
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  if (checking) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text-muted)',
    }}>Loading...</div>
  );

  if (!user) return <AuthScreen onAuth={u => { setUser(u); setNeedsResume(true); }} />;
  if (needsResume) return <ResumeUpload onComplete={() => setNeedsResume(false)} />;

  return (
    <Dashboard user={user} onLogout={() => {
      clearToken();
      setUser(null);
      setNeedsResume(false);
    }} />
  );
}
