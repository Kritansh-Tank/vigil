import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatTimestamp(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getRiskColor(score: number): string {
  if (score <= 30) return "#16a34a";
  if (score <= 50) return "#ca8a04";
  if (score <= 74) return "#ea580c";
  if (score <= 84) return "#dc2626";
  return "#991b1b";
}

export function getRiskSeverity(score: number): "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score <= 30) return "SAFE";
  if (score <= 50) return "LOW";
  if (score <= 74) return "MEDIUM";
  if (score <= 84) return "HIGH";
  return "CRITICAL";
}

export function getRiskBgColor(score: number): string {
  if (score <= 30) return "#dcfce7";
  if (score <= 50) return "#fef9c3";
  if (score <= 74) return "#ffedd5";
  if (score <= 84) return "#fee2e2";
  return "#fecaca";
}

export function getSensorStatus(
  type: string,
  value: number
): "NORMAL" | "WARNING" | "DANGER" {
  const thresholds: Record<string, { warning: number; danger: number }> = {
    CH4:      { warning: 10,  danger: 25  },
    CO:       { warning: 25,  danger: 50  },
    H2S:      { warning: 5,   danger: 10  },
    SO2:      { warning: 2,   danger: 5   },
    TEMP:     { warning: 65,  danger: 85  },
    PRESSURE: { warning: 120, danger: 150 },
  };
  const t = thresholds[type];
  if (!t) return "NORMAL";
  if (value >= t.danger) return "DANGER";
  if (value >= t.warning) return "WARNING";
  return "NORMAL";
}
