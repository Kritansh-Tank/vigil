"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/shared/Sidebar";
import PlantMap from "@/components/dashboard/PlantMap";
import SensorGauge from "@/components/dashboard/SensorGauge";
import RiskScoreCard from "@/components/dashboard/RiskScoreCard";
import AlertTimeline from "@/components/dashboard/AlertTimeline";
import ScenarioControls from "@/components/dashboard/ScenarioControls";
import { SensorReading, ZoneRiskScore, Alert, SensorType } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { RefreshCw, Users, AlertTriangle, Shield, TrendingUp, Siren, Clock } from "lucide-react";

const SENSOR_TYPES: SensorType[] = ["CH4", "CO", "H2S", "SO2", "TEMP", "PRESSURE"];

export default function DashboardPage() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [zones, setZones] = useState<ZoneRiskScore[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trends, setTrends] = useState<Record<string, number[]>>({});
  const [shiftStatus, setShiftStatus] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const fetchRisks = useCallback(async () => {
    setRiskLoading(true);
    try {
      const r = await fetch("/api/risk/zones");
      const d = await r.json();
      if (d.zones) setZones(d.zones);
    } finally { setRiskLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch("/api/alerts");
      const d = await r.json();
      if (d.alerts) setAlerts(d.alerts);
    } catch { }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const r = await fetch("/api/risk/history");
      const d = await r.json();
      if (d.trends) setTrends(d.trends);
    } catch { }
  }, []);

  const fetchShift = useCallback(async () => {
    try {
      const r = await fetch("/api/shifts");
      const d = await r.json();
      if (d.current) setShiftStatus(d.current);
    } catch { }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/sensors/stream");
        if (!res.ok) throw new Error("fetch failed");
        const { type, payload } = await res.json();
        if (type === "readings") {
          setReadings(payload);
          setLastUpdate(new Date());
          setConnected(true);
        }
      } catch {
        setConnected(false);
      }
    }

    tick(); // immediate first tick
    const iv = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);


  useEffect(() => {
    fetchRisks(); fetchAlerts(); fetchTrends(); fetchShift();
    const iv = setInterval(() => { fetchRisks(); fetchAlerts(); fetchTrends(); }, 60_000);
    const shiftIv = setInterval(fetchShift, 300_000); // refresh shift every 5 min
    return () => { clearInterval(iv); clearInterval(shiftIv); };
  }, [fetchRisks, fetchAlerts, fetchTrends, fetchShift]);

  async function ack(id: string) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: id, status: "ACKNOWLEDGED" })
    });
    fetchAlerts();
  }

  const maxRisk = zones.reduce((m, z) => Math.max(m, z.score), 0);
  const activeAlt = alerts.filter((a) => a.status === "ACTIVE").length;
  const totalW = zones.reduce((s, z) => s + z.worker_count, 0);
  const elevZones = zones.filter((z) => z.severity === "HIGH" || z.severity === "CRITICAL").length;
  const criticalZone = zones.find((z) => z.score > 85) ?? null;

  const riskColor = (s: number) => s >= 75 ? "#dc2626" : s >= 50 ? "#d97706" : "#16a34a";

  const KPI_DATA = [
    {
      label: "Max Zone Risk", value: maxRisk, unit: "/ 100",
      Icon: AlertTriangle, accent: riskColor(maxRisk),
      sub: maxRisk >= 75 ? "Immediate action required" : maxRisk >= 50 ? "Elevated — monitor closely" : "All zones nominal",
    },
    {
      label: "Active Alerts", value: activeAlt, unit: "alerts",
      Icon: Shield, accent: activeAlt > 0 ? "#dc2626" : "#16a34a",
      sub: activeAlt > 0 ? `${activeAlt} requiring attention` : "No active alerts",
    },
    {
      label: "Personnel On-Site", value: totalW, unit: "workers",
      Icon: Users, accent: "#2563eb",
      sub: "Across all 6 zones",
    },
    {
      label: "Elevated Zones", value: elevZones, unit: "/ 6",
      Icon: TrendingUp, accent: elevZones > 0 ? "#d97706" : "#16a34a",
      sub: elevZones > 0 ? `${elevZones} zone${elevZones > 1 ? "s" : ""} need attention` : "All zones clear",
    },
  ];

  return (
    <div className="layout">
      <Sidebar />
      <main className="main" style={{ background: "#f1f5f9", minHeight: "100vh" }}>

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="topbar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", lineHeight: 1 }}>Command Centre</p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Coke Oven Battery · Visakhapatnam Steel Plant</p>
          </div>

          {lastUpdate && (
            <p className="hide-mobile" style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{formatTimestamp(lastUpdate)}</p>
          )}

          {/* Connection status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: connected ? "#f0fdf4" : "#fef2f2", border: `1px solid ${connected ? "#bbf7d0" : "#fecaca"}`, flexShrink: 0 }}>
            <div className={connected ? "live-dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#22c55e" : "#dc2626", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: connected ? "#15803d" : "#dc2626" }}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          <button className="btn btn-ghost" onClick={fetchRisks} disabled={riskLoading}
            style={{ fontSize: 12, padding: "7px 12px", flexShrink: 0 }}>
            <RefreshCw size={12} className={riskLoading ? "anim-spin" : ""} />
            <span className="hide-mobile">Refresh Risk</span>
          </button>
        </div>

        <div className="content">

          {/* ── Auto-Emergency Banner ──────────────────────────────────────────── */}
          {criticalZone && (
            <div className="anim-fadeup" style={{
              marginBottom: 16, padding: "12px 20px",
              background: "linear-gradient(135deg, #991b1b, #dc2626)",
              borderRadius: 12, display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
            }}>
              <Siren size={18} color="white" className="anim-blink" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "white", lineHeight: 1 }}>
                  AUTO-EMERGENCY TRIGGERED — {criticalZone.zone_id.replace("_", " ")} · Risk Score {criticalZone.score}/100
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                  Emergency response auto-generated · Email alert dispatched · S3 report archived
                </p>
              </div>
              <a href="/emergency" style={{
                fontSize: 11, fontWeight: 700, padding: "6px 14px",
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 8, color: "white", textDecoration: "none",
                backdropFilter: "blur(4px)",
              }}>
                View Emergency →
              </a>
            </div>
          )}

          {/* ── KPI Row ───────────────────────────────────────────────────────── */}
          <div className="grid-kpi">
            {KPI_DATA.map((k, i) => (
              <div key={k.label} className="card anim-fadeup"
                style={{ padding: 20, borderTop: `3px solid ${k.accent}`, animationDelay: `${i * 60}ms` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8" }}>
                    {k.label}
                  </p>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <k.Icon size={15} color={k.accent} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 36, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                    {k.value}
                  </span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{k.unit}</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b" }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Scenarios ─────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <ScenarioControls onScenarioStart={() => setTimeout(fetchRisks, 5000)} />
          </div>

          {/* ── Main grid ─────────────────────────────────────────────────────── */}
          <div className="grid-main">

            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <PlantMap zones={zones} />

              {/* Sensor gauges */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="section-title">Live Sensor Readings</p>
                    <p className="section-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Worst-case across all zones · Streams every 3 s</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <div className="live-dot" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>Streaming</span>
                  </div>
                </div>
                <div className="grid-sensors">
                  {SENSOR_TYPES.map((t) => <SensorGauge key={t} readings={readings} sensorType={t} />)}
                </div>
              </div>

              {/* Zone cards */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                  <p className="section-title">Zone Risk Assessment</p>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: "#eff6ff", color: "#2563eb", flexShrink: 0 }}>
                    AI analysis · 6 zones
                  </span>
                </div>
                <div className="grid-zones">
                  {zones.length > 0
                    ? zones.map((z, i) => (
                      <div key={z.zone_id} className="anim-fadeup" style={{ animationDelay: `${i * 40}ms` }}>
                        <RiskScoreCard zone={z} trend={trends[z.zone_id]} />
                      </div>
                    ))
                    : Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="card" style={{ padding: 16, height: 140 }}>
                        <div style={{ height: 14, width: 80, borderRadius: 6, background: "#f1f5f9", marginBottom: 10 }} />
                        <div style={{ height: 10, width: "100%", borderRadius: 99, background: "#f1f5f9", marginBottom: 8 }} />
                        <div style={{ height: 10, width: "60%", borderRadius: 99, background: "#f1f5f9" }} />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Right — Shift Status + Alerts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Shift Status Card */}
              {shiftStatus && (
                <div className="card anim-fadeup" style={{ padding: 16, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={13} color="#2563eb" />
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Shift Status</p>
                    </div>
                    {shiftStatus.is_changeover_window && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#fef9c3", color: "#a16207", border: "1px solid #fde68a" }}>
                        ⚠ CHANGEOVER WINDOW
                      </span>
                    )}
                  </div>

                  {/* Active shift banner */}
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: `#fff`, paddingLeft: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{shiftStatus.label}</p>
                        <p style={{ fontSize: 11, color: "#64748b" }}>{shiftStatus.start} – {shiftStatus.end} IST · {shiftStatus.worker_count} workers on-site</p>
                      </div>
                    </div>
                  </div>

                  {/* Workers by zone */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {Object.entries(shiftStatus.workers_by_zone as Record<string, number>).map(([zone, count]) => (
                      <span key={zone} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#475569" }}>
                        {zone.replace("ZONE_", "Z")} · {count}
                      </span>
                    ))}
                  </div>

                  {/* Time until changeover */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Next changeover in</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: shiftStatus.minutes_to_changeover < 30 ? "#dc2626" : "#0f172a" }}>
                      {shiftStatus.hours_to_changeover}h {shiftStatus.mins_remainder}m
                    </span>
                  </div>
                </div>
              )}

              {/* Alert Timeline */}
              <AlertTimeline alerts={alerts} onAcknowledge={ack} />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
