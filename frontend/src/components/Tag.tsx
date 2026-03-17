import { theme } from "@/lib/theme";

export function Tag({
  children,
  color = theme.accent,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {children}
    </span>
  );
}
