"use client";

import { useState, useEffect, useCallback } from "react";
import { api, trackActivity } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Icons } from "./Icons";
import { Tag } from "./Tag";
import { StatCard } from "./StatCard";
import { JobCard } from "./JobCard";
import { InsightsModal } from "./InsightsModal";
import type { User, Profile, Match, MatchStats } from "@/lib/types";

type TabId = "matches" | "profile" | "settings";

export function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<TabId>("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    total_matches: 0,
    today_matches: 0,
    notifications_sent: 0,
    avg_score: 0,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s, p] = await Promise.all([
        api<{ matches: Match[] }>("/matches").catch(() => ({ matches: [] })),
        api<MatchStats>("/matches/stats").catch(() => ({
          total_matches: 0,
          today_matches: 0,
          notifications_sent: 0,
          avg_score: 0,
        })),
        api<Profile>("/profile").catch(() => null),
      ]);
      setMatches(m.matches || []);
      setStats(s);
      setProfile(p);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navItems: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: "matches", icon: Icons.target, label: "Matches" },
    { id: "profile", icon: Icons.user, label: "Profile" },
    { id: "settings", icon: Icons.bell, label: "Settings" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${theme.border}`,
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          background: `${theme.surface}cc`,
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span style={{ fontSize: 20 }}>&#127919;</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Job Agent</span>
          <Tag color={theme.green}>Active</Tag>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                trackActivity("tab_switch", { tab: item.id });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                background:
                  tab === item.id ? theme.accentSoft : "transparent",
                color: tab === item.id ? theme.accent : theme.textMuted,
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* AI Insights Button */}
          <button
            onClick={() => {
              setShowInsights(true);
              trackActivity("open_insights");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: theme.accentSoft,
              border: `1px solid ${theme.accent}40`,
              borderRadius: 8,
              color: theme.accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {Icons.zap} AI Insights
          </button>
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "transparent",
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.textMuted,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {Icons.logout} Sign Out
          </button>
        </div>
      </header>

      <div
        style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}
      >
        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          <StatCard
            icon={Icons.target}
            label="Total Matches"
            value={stats.total_matches}
            color={theme.accent}
          />
          <StatCard
            icon={Icons.zap}
            label="Today"
            value={stats.today_matches}
            color={theme.amber}
          />
          <StatCard
            icon={Icons.bell}
            label="Alerts Sent"
            value={stats.notifications_sent}
            color={theme.green}
          />
          <StatCard
            icon={Icons.chart}
            label="Avg Score"
            value={`${stats.avg_score}%`}
            color={theme.accent}
          />
        </div>

        {/* Matches Tab */}
        {tab === "matches" && (
          <div className="animate-fade-in">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                Recent Matches
              </h2>
              <span style={{ fontSize: 12, color: theme.textMuted }}>
                Updated 3x daily
              </span>
            </div>
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: theme.textMuted,
                }}
              >
                Loading matches...
              </div>
            ) : matches.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>
                  &#128237;
                </div>
                <h3 style={{ margin: "0 0 6px", color: theme.text }}>
                  No matches yet
                </h3>
                <p style={{ color: theme.textMuted, fontSize: 14 }}>
                  Your agent is searching. Matches appear after the next
                  scan.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {matches.map((m) => (
                  <JobCard
                    key={m.id}
                    job={m.jobs || { id: "", title: "Unknown" }}
                    score={m.score}
                    summary={m.ai_summary}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {tab === "profile" && profile && (
          <div className="animate-fade-in">
            <h2
              style={{
                margin: "0 0 18px",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              Your Profile
            </h2>
            <div
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 28,
              }}
            >
              <div style={{ marginBottom: 20 }}>
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
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {(profile.primary_roles || []).map((r) => (
                    <Tag key={r} color={theme.accent}>
                      {r}
                    </Tag>
                  ))}
                  {(!profile.primary_roles ||
                    profile.primary_roles.length === 0) && (
                    <span
                      style={{
                        color: theme.textDim,
                        fontSize: 13,
                      }}
                    >
                      Not set
                    </span>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
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
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {(profile.skills || []).map((s) => (
                    <Tag key={s} color={theme.green}>
                      {s}
                    </Tag>
                  ))}
                  {(!profile.skills || profile.skills.length === 0) && (
                    <span
                      style={{
                        color: theme.textDim,
                        fontSize: 13,
                      }}
                    >
                      Not set
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    Seniority
                  </div>
                  <div style={{ color: theme.text, fontSize: 14 }}>
                    {profile.seniority_level || "\u2014"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    Remote
                  </div>
                  <div style={{ color: theme.text, fontSize: 14 }}>
                    {profile.remote_preference || "\u2014"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    Salary Target
                  </div>
                  <div style={{ color: theme.text, fontSize: 14 }}>
                    {profile.salary_expectation || "\u2014"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    Locations
                  </div>
                  <div style={{ color: theme.text, fontSize: 14 }}>
                    {(profile.preferred_locations || []).join(", ") ||
                      "\u2014"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="animate-fade-in">
            <h2
              style={{
                margin: "0 0 18px",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              Notification Settings
            </h2>
            <div
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 28,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  Delivery Method
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["email", "sms", "both"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={async () => {
                        await api("/profile", {
                          method: "PATCH",
                          body: { notification_method: m },
                        });
                        setProfile((prev) =>
                          prev
                            ? { ...prev, notification_method: m }
                            : prev
                        );
                        trackActivity("change_notification", { method: m });
                      }}
                      style={{
                        padding: "10px 20px",
                        border: `1px solid ${
                          profile?.notification_method === m
                            ? theme.accent
                            : theme.border
                        }`,
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        background:
                          profile?.notification_method === m
                            ? theme.accentSoft
                            : "transparent",
                        color:
                          profile?.notification_method === m
                            ? theme.accent
                            : theme.textMuted,
                        textTransform: "capitalize",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: 18,
                  background: theme.surface,
                  borderRadius: 12,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {Icons.zap}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    Agent Schedule
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: theme.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  Your agent scans for new jobs at{" "}
                  <strong style={{ color: theme.text }}>8:00 AM</strong>,{" "}
                  <strong style={{ color: theme.text }}>1:00 PM</strong>,
                  and{" "}
                  <strong style={{ color: theme.text }}>6:00 PM</strong>{" "}
                  UTC daily. Top 3 matches are sent as a summary.
                </p>
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  background: theme.surface,
                  borderRadius: 12,
                  border: `1px solid ${theme.border}`,
                }}
              >
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
                  Cost Transparency
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: theme.textMuted }}>
                      AI calls/day:
                    </span>{" "}
                    <span
                      style={{
                        color: theme.text,
                        fontWeight: 600,
                      }}
                    >
                      ~3
                    </span>
                  </div>
                  <div>
                    <span style={{ color: theme.textMuted }}>
                      Est. monthly:
                    </span>{" "}
                    <span
                      style={{
                        color: theme.green,
                        fontWeight: 600,
                      }}
                    >
                      ~$0.10/user
                    </span>
                  </div>
                  <div>
                    <span style={{ color: theme.textMuted }}>
                      Jobs scanned:
                    </span>{" "}
                    <span
                      style={{
                        color: theme.text,
                        fontWeight: 600,
                      }}
                    >
                      100+/day
                    </span>
                  </div>
                  <div>
                    <span style={{ color: theme.textMuted }}>
                      Matches/alert:
                    </span>{" "}
                    <span
                      style={{
                        color: theme.text,
                        fontWeight: 600,
                      }}
                    >
                      Top 3
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights Modal */}
      {showInsights && <InsightsModal onClose={() => setShowInsights(false)} />}
    </div>
  );
}
