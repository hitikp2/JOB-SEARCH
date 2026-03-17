"use client";

import { useState, useEffect } from "react";
import { api, trackActivity } from "@/lib/api";
import { theme } from "@/lib/theme";
import { Icons } from "./Icons";
import type { Insight } from "@/lib/types";

const iconMap: Record<string, React.ReactNode> = {
  user: Icons.user,
  check: Icons.check,
  chart: Icons.chart,
  briefcase: Icons.briefcase,
  target: Icons.target,
  zap: Icons.zap,
  bell: Icons.bell,
};

const priorityColors: Record<string, { bg: string; border: string; badge: string }> = {
  high: { bg: theme.redSoft, border: `${theme.red}30`, badge: theme.red },
  medium: { bg: theme.amberSoft, border: `${theme.amber}30`, badge: theme.amber },
  low: { bg: theme.greenSoft, border: `${theme.green}30`, badge: theme.green },
};

export function InsightsModal({ onClose }: { onClose: () => void }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api<{ insights: Insight[] }>("/insights");
        setInsights(data.insights || []);
        trackActivity("view_insights");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load insights");
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          margin: 20,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: theme.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: theme.accent }}>{Icons.zap}</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text }}>
                AI Insights
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: theme.textMuted }}>
                Personalized suggestions for your job search
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: theme.textMuted,
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ overflow: "auto", padding: 24, flex: 1 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
              <span className="animate-spin-slow" style={{ display: "inline-block", fontSize: 24, marginBottom: 12 }}>
                &#9881;
              </span>
              <div>Analyzing your profile and matches...</div>
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: 40, color: theme.red, fontSize: 14 }}>
              {error}
            </div>
          )}

          {!loading && !error && insights.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
              No insights available yet. Complete your profile to get started.
            </div>
          )}

          {!loading && insights.map((insight, i) => {
            const colors = priorityColors[insight.priority] || priorityColors.low;
            return (
              <div
                key={i}
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: i < insights.length - 1 ? 12 : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: colors.badge }}>
                      {iconMap[insight.icon] || Icons.zap}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                        {insight.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: colors.bg,
                          color: colors.badge,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {insight.priority}
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
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: theme.textDim }}>
            Insights update with each job scan
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: 8,
              background: theme.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
