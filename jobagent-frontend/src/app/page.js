'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, apiUpload, setToken, clearToken, getToken } from '../lib/api';

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
function ResumeUpload({ onComplete, embedded = false }) {
  const [mode, setMode] = useState('file'); // 'file' or 'text'
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const acceptedTypes = '.pdf,.txt,.jpg,.jpeg,.png,.doc,.docx';
  const acceptedMimes = [
    'application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f) {
      if (!acceptedMimes.includes(f.type) && !f.name.match(/\.(pdf|txt|jpe?g|png|docx?)$/i)) {
        setError('Unsupported file. Use PDF, TXT, JPG, PNG, DOC, or DOCX.');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (mode === 'file' && file) {
        const formData = new FormData();
        formData.append('resume', file);
        data = await apiUpload('/profile/resume/upload', formData);
      } else {
        data = await api('/profile/resume', { method: 'POST', body: { resume_text: text } });
      }
      setResult(data.profile);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const canSubmit = mode === 'file' ? !!file : text.length >= 50;

  if (result) {
    return (
      <div style={{
        ...(embedded ? {} : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, var(--green-soft) 0%, var(--bg) 60%)' }),
      }}>
        <div style={{ maxWidth: 520, padding: '20px', width: '100%', ...(embedded ? { margin: '0 auto' } : {}) }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-up">
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%', background: 'var(--green-soft)',
              border: '2px solid #34d39940', marginBottom: 16, fontSize: 24,
            }}>✓</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>Profile {embedded ? 'Updated' : 'Extracted'}</h2>
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
          }}>{embedded ? 'Done' : 'Go to Dashboard →'}</button>
        </div>
      </div>
    );
  }

  const uploadArea = (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleFileDrop}
      onClick={() => document.getElementById('resume-file-input')?.click()}
      style={{
        width: '100%', minHeight: 180, padding: 28, background: dragOver ? 'var(--accent-soft)' : 'var(--surface)',
        border: `2px dashed ${dragOver ? 'var(--accent)' : file ? '#34d399' : 'var(--border)'}`,
        borderRadius: 14, cursor: 'pointer', textAlign: 'center',
        transition: 'all 0.2s', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
    >
      <input id="resume-file-input" type="file" accept={acceptedTypes}
        onChange={handleFileDrop} style={{ display: 'none' }} />
      {file ? (
        <>
          <div style={{ fontSize: 32 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#34d399' }}>{file.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {(file.size / 1024).toFixed(1)} KB · Click or drag to replace
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 32, opacity: 0.5 }}>📎</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
            Drag & drop your resume here
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            or click to browse · PDF, JPG, PNG, DOC, DOCX, TXT
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Max 5MB</div>
        </>
      )}
    </div>
  );

  return (
    <div style={{
      ...(embedded ? {} : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, var(--accent-soft) 0%, var(--bg) 60%)' }),
    }}>
      <div style={{ maxWidth: 560, width: '100%', padding: '20px', ...(embedded ? { margin: '0 auto' } : {}) }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📄</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>{embedded ? 'Re-upload Resume' : 'Upload Your Resume'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Upload a file or paste text. AI will extract your profile.</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {[{ id: 'file', label: 'Upload File' }, { id: 'text', label: 'Paste Text' }].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setError(''); }}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                background: mode === m.id ? 'var(--accent)' : 'transparent',
                color: mode === m.id ? '#fff' : 'var(--text-muted)',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleExtract}>
          {mode === 'file' ? uploadArea : (
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste your resume text here..."
              style={{
                width: '100%', minHeight: 240, padding: 18, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)',
                fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none',
                fontFamily: "'Source Serif 4', serif", boxSizing: 'border-box',
              }}
            />
          )}
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>{error}</p>}
          <button type="submit" disabled={loading || !canSubmit} style={{
            width: '100%', padding: 14, marginTop: 16, border: 'none', borderRadius: 10,
            background: loading || !canSubmit ? 'var(--text-dim)' : 'var(--accent)',
            color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? 'Analyzing resume...' : 'Extract Profile with AI'}
          </button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 10 }}>
          Supports PDF, JPG, PNG, DOC, DOCX, and plain text. You can re-upload anytime.
        </p>
      </div>
    </div>
  );
}

// ─── MATCH CARD ───
function MatchCard({ match, onApplyClick }) {
  const [hovered, setHovered] = useState(false);
  const { job, score, ai_summary, created_at, sent } = match;
  const j = job || match.jobs || {};

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => { if (j.url) { window.open(j.url, '_blank'); onApplyClick?.(); } }}
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

// ─── AI INSIGHTS MODAL ───
function InsightsModal({ onClose }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/experience/insights');
        setInsights(data.insights);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    })();
  }, []);

  const qualityColors = { low: '#ef4444', medium: '#fbbf24', high: '#34d399' };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 0, boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '24px 28px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #a78bfa20, #fbbf2420)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>💡</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>AI Insights</h2>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dim)' }}>Personalized suggestions for your job search</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20,
            cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ padding: '24px 28px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }}>🧠</div>
              Analyzing your profile & matches...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
              {error}
            </div>
          ) : insights ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary */}
              <div style={{
                padding: 18, background: 'var(--bg)', borderRadius: 14,
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Summary</span>
                  <Tag color={qualityColors[insights.match_quality] || '#6b7280'}>
                    {insights.match_quality} quality
                  </Tag>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, fontFamily: "'Source Serif 4', serif", color: 'var(--text-muted)' }}>
                  {insights.summary}
                </p>
              </div>

              {/* Strengths */}
              {insights.strengths?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Strengths</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {insights.strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                        <span style={{ color: '#34d399', flexShrink: 0 }}>+</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {insights.improvements?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Suggestions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {insights.improvements.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                        <span style={{ color: '#fbbf24', flexShrink: 0 }}>→</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill gaps */}
              {insights.skill_gaps?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Skill Gaps</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {insights.skill_gaps.map((s, i) => <Tag key={i} color="#ef4444">{s}</Tag>)}
                  </div>
                </div>
              )}

              {/* Market trends */}
              {insights.market_trends && (
                <div style={{
                  padding: 16, background: 'linear-gradient(135deg, #a78bfa08, #60a5fa08)',
                  borderRadius: 12, border: '1px solid #a78bfa15',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Market Trends</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', fontFamily: "'Source Serif 4', serif" }}>
                    {insights.market_trends}
                  </p>
                </div>
              )}

              {/* Next steps */}
              {insights.next_steps?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Next Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {insights.next_steps.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
                        fontSize: 13, color: 'var(--text-muted)',
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: 'var(--accent-soft)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>{i + 1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {insights.confidence_score && (
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    Confidence: {insights.confidence_score}%
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
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
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showReupload, setShowReupload] = useState(false);

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

  // Track match views for experience data
  const trackAction = useCallback(async (action, matchId = null, extra = {}) => {
    try {
      await api('/experience', {
        method: 'POST',
        body: { action, match_id: matchId, ...extra }
      });
    } catch (err) {
      // Silently fail - don't block UX
    }
  }, []);

  // Test matching button handler
  const handleTestRun = async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      await trackAction('test_run');
      const result = await api('/admin/run-worker', { method: 'POST' });
      setTestResult({ success: true, message: result.message || 'Worker completed successfully!' });
      // Reload data after test
      await loadData();
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    }
    setTestRunning(false);
  };

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

      {/* AI Insights Modal */}
      {showInsights && <InsightsModal onClose={() => setShowInsights(false)} />}

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
        <div style={{ display: 'flex', gap: 8 }}>
          {/* AI Insights button */}
          <button onClick={() => setShowInsights(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: 'linear-gradient(135deg, #a78bfa15, #fbbf2415)',
            border: '1px solid #a78bfa30', borderRadius: 8,
            color: '#fbbf24', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>💡 AI Insights</button>
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>Sign Out</button>
        </div>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Recent Matches</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Test Matching Button */}
                <button onClick={handleTestRun} disabled={testRunning} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  background: testRunning ? 'var(--text-dim)' : 'linear-gradient(135deg, #34d39920, #34d39910)',
                  border: '1px solid #34d39940', borderRadius: 8,
                  color: testRunning ? 'var(--text-dim)' : '#34d399', fontSize: 12, fontWeight: 600,
                  cursor: testRunning ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
                  {testRunning ? '⏳ Running...' : '🧪 Test Matching'}
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', fontFamily: "'Source Serif 4', serif" }}>
                  Updated 3x daily
                </span>
              </div>
            </div>

            {/* Test Result Banner */}
            {testResult && (
              <div style={{
                padding: '12px 18px', marginBottom: 16, borderRadius: 12,
                background: testResult.success ? '#34d39910' : '#ef444410',
                border: `1px solid ${testResult.success ? '#34d39930' : '#ef444430'}`,
                color: testResult.success ? '#34d399' : '#ef4444',
                fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>{testResult.success ? '✓' : '✗'} {testResult.message}</span>
                <button onClick={() => setTestResult(null)} style={{
                  background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16,
                }}>×</button>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading matches...</div>
            ) : matches.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 60, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 16,
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <h3 style={{ margin: '0 0 6px' }}>No matches yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                  Your agent is searching. Matches appear after the next scan at 8:00 AM, 1:00 PM, or 6:00 PM UTC.
                </p>
                <button onClick={handleTestRun} disabled={testRunning} style={{
                  padding: '10px 24px', borderRadius: 10, border: '1px solid #34d39940',
                  background: '#34d39915', color: '#34d399', fontSize: 13, fontWeight: 600,
                  cursor: testRunning ? 'wait' : 'pointer', fontFamily: 'inherit',
                }}>
                  {testRunning ? 'Running...' : '🧪 Run Test Scan Now'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matches.map(m => (
                  <div key={m.id} onClick={() => trackAction('view', m.id)}>
                    <MatchCard match={m} onApplyClick={() => trackAction('apply_click', m.id)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && profile && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Your Profile</h2>
              <button onClick={() => setShowReupload(!showReupload)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: showReupload ? 'var(--accent-soft)' : 'transparent',
                border: `1px solid ${showReupload ? 'var(--accent-glow)' : 'var(--border)'}`,
                borderRadius: 8, color: showReupload ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                📄 {showReupload ? 'Hide Upload' : 'Re-upload Resume'}
              </button>
            </div>

            {/* Re-upload section */}
            {showReupload && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 28, marginBottom: 20,
              }}>
                <ResumeUpload embedded onComplete={() => { setShowReupload(false); loadData(); }} />
              </div>
            )}

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

              {profile.industries?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Industries</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.industries.map(i => <Tag key={i} color="#60a5fa">{i}</Tag>)}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PrefItem label="Salary" value={profile.salary_expectation} />
                <PrefItem label="Locations" value={(profile.preferred_locations || []).join(', ')} />
                <PrefItem label="Remote" value={profile.remote_preference} />
                <PrefItem label="Work Schedule" value={(profile.work_schedule || 'full_time').replace('_', ' ')} />
                <PrefItem label="Location Type" value={profile.location_type || 'any'} />
                <PrefItem label="Notifications" value={profile.notification_method} />
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600 }}>Settings</h2>

            {/* ── Job Search Preferences ── */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 28, marginBottom: 20, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg, #a78bfa, #fbbf24)',
              }} />
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Job Search Preferences
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 18px', fontFamily: "'Source Serif 4', serif" }}>
                These settings directly control which jobs the AI finds and matches for you.
              </p>

              {/* Work Schedule */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Work Schedule</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { value: 'full_time', label: 'Full Time' },
                    { value: 'part_time', label: 'Part Time' },
                    { value: 'contract', label: 'Contract' },
                    { value: 'internship', label: 'Internship' },
                  ].map(opt => (
                    <button key={opt.value} onClick={async () => {
                      await api('/profile', { method: 'PATCH', body: { work_schedule: opt.value } });
                      setProfile(prev => ({ ...prev, work_schedule: opt.value }));
                    }} style={{
                      padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.25s',
                      background: profile?.work_schedule === opt.value ? 'var(--accent-soft)' : 'transparent',
                      color: profile?.work_schedule === opt.value ? 'var(--accent)' : 'var(--text-dim)',
                      border: `1px solid ${profile?.work_schedule === opt.value ? 'var(--accent-glow)' : 'var(--border)'}`,
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Location Type */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Location Type</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { value: 'any', label: 'Any' },
                    { value: 'remote', label: 'Remote Only' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'local', label: 'On-site / Local' },
                  ].map(opt => (
                    <button key={opt.value} onClick={async () => {
                      await api('/profile', { method: 'PATCH', body: { location_type: opt.value } });
                      setProfile(prev => ({ ...prev, location_type: opt.value }));
                    }} style={{
                      padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.25s',
                      background: profile?.location_type === opt.value ? '#34d39918' : 'transparent',
                      color: profile?.location_type === opt.value ? '#34d399' : 'var(--text-dim)',
                      border: `1px solid ${profile?.location_type === opt.value ? '#34d39940' : 'var(--border)'}`,
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Search Radius (only visible for local/hybrid) */}
              {(profile?.location_type === 'local' || profile?.location_type === 'hybrid') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
                    Search Radius: {profile?.search_radius || 50} miles
                  </div>
                  <input type="range" min="10" max="200" step="10"
                    value={profile?.search_radius || 50}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value);
                      setProfile(prev => ({ ...prev, search_radius: val }));
                    }}
                    onMouseUp={async (e) => {
                      await api('/profile', { method: 'PATCH', body: { search_radius: parseInt(e.target.value) } });
                    }}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
                    <span>10 mi</span><span>200 mi</span>
                  </div>
                </div>
              )}

              {/* Seniority Level */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Seniority Level</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['junior', 'mid', 'senior', 'lead', 'executive'].map(level => (
                    <button key={level} onClick={async () => {
                      await api('/profile', { method: 'PATCH', body: { seniority_level: level } });
                      setProfile(prev => ({ ...prev, seniority_level: level }));
                    }} style={{
                      padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize',
                      transition: 'all 0.25s',
                      background: profile?.seniority_level === level ? '#fbbf2418' : 'transparent',
                      color: profile?.seniority_level === level ? '#fbbf24' : 'var(--text-dim)',
                      border: `1px solid ${profile?.seniority_level === level ? '#fbbf2440' : 'var(--border)'}`,
                    }}>{level}</button>
                  ))}
                </div>
              </div>

              {/* Industries (editable tags) */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Industries</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(profile?.industries || []).map((ind, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: '#60a5fa18', color: '#60a5fa', border: '1px solid #60a5fa25',
                    }}>
                      {ind}
                      <button onClick={async () => {
                        const updated = (profile.industries || []).filter((_, idx) => idx !== i);
                        await api('/profile', { method: 'PATCH', body: { industries: updated } });
                        setProfile(prev => ({ ...prev, industries: updated }));
                      }} style={{
                        background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
                        fontSize: 14, padding: 0, lineHeight: 1,
                      }}>×</button>
                    </span>
                  ))}
                  {(!profile?.industries || profile.industries.length === 0) && (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>No industries set — add one below</span>
                  )}
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const input = e.target.elements.newIndustry;
                  const val = input.value.trim();
                  if (!val) return;
                  const updated = [...(profile?.industries || []), val];
                  await api('/profile', { method: 'PATCH', body: { industries: updated } });
                  setProfile(prev => ({ ...prev, industries: updated }));
                  input.value = '';
                }} style={{ display: 'flex', gap: 8 }}>
                  <input name="newIndustry" placeholder="e.g. FinTech, Healthcare, SaaS..."
                    style={{
                      flex: 1, padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)',
                      fontSize: 13, outline: 'none', fontFamily: 'inherit',
                    }} />
                  <button type="submit" style={{
                    padding: '10px 18px', borderRadius: 10, border: '1px solid #60a5fa40',
                    background: '#60a5fa15', color: '#60a5fa', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Add</button>
                </form>
              </div>
            </div>

            {/* ── Notification Method ── */}
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

            {/* ── Agent Schedule ── */}
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
                Each scan uses your saved preferences above to fetch jobs, match against your profile, and send personalized alerts.
              </p>
            </div>

            {/* ── Cost Transparency ── */}
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
