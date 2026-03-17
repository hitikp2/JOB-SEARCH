import { theme } from "@/lib/theme";

export function StatCard({
  icon,
  label,
  value,
  color = theme.accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: "20px 22px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ color }}>{icon}</div>
        <span
          style={{
            fontSize: 12,
            color: theme.textMuted,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: theme.text,
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
