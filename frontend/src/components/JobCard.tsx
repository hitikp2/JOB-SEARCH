"use client";

import { useState } from "react";
import { theme } from "@/lib/theme";
import { Tag } from "./Tag";
import type { Job } from "@/lib/types";

export function JobCard({
  job,
  score,
  summary,
}: {
  job: Job;
  score?: number;
  summary?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const scoreColor =
    score && score >= 90
      ? theme.green
      : score && score >= 70
        ? theme.amber
        : theme.textMuted;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? theme.cardHover : theme.card,
        border: `1px solid ${hovered ? theme.borderFocus : theme.border}`,
        borderRadius: 14,
        padding: 20,
        transition: "all 0.2s",
        cursor: "pointer",
      }}
      onClick={() => job.url && window.open(job.url, "_blank")}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: "0 0 4px",
              fontSize: 15,
              fontWeight: 600,
              color: theme.text,
            }}
          >
            {job.title}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: theme.textMuted }}>
            {job.company}
            {job.company && job.location ? " · " : ""}
            {job.location}
          </p>
        </div>
        {score && (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: `${scoreColor}18`,
              border: `1px solid ${scoreColor}30`,
              fontSize: 12,
              fontWeight: 700,
              color: scoreColor,
              fontFamily: "var(--font-mono)",
            }}
          >
            {score}%
          </div>
        )}
      </div>

      <div
        style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
      >
        {job.salary && <Tag color={theme.green}>{job.salary}</Tag>}
        {job.location?.toLowerCase().includes("remote") && (
          <Tag color={theme.accent}>Remote</Tag>
        )}
      </div>

      {summary && (
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            color: theme.textMuted,
            lineHeight: 1.5,
          }}
        >
          {summary}
        </p>
      )}
    </div>
  );
}
