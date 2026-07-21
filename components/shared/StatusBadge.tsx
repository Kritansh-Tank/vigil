"use client";

type Severity = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface StatusBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
  pulse?: boolean;
}

const CONFIGS: Record<Severity, { bg: string; color: string; border: string }> = {
  SAFE:     { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  LOW:      { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  MEDIUM:   { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  HIGH:     { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  CRITICAL: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
};

export default function StatusBadge({ severity, size = "md", pulse = false }: StatusBadgeProps) {
  const cfg = CONFIGS[severity] || CONFIGS.SAFE;
  const fontSize = size === "sm" ? 10 : 11;
  const px = size === "sm" ? "7px" : "9px";
  const py = size === "sm" ? "2px" : "3px";

  return (
    <span
      className="inline-flex items-center gap-1 font-bold rounded-full"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize, paddingLeft: px, paddingRight: px, paddingTop: py, paddingBottom: py,
        letterSpacing: "0.04em",
        animation: pulse ? "pulse-ring 2s ease-out infinite" : undefined,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cfg.color }} />
      {severity}
    </span>
  );
}
