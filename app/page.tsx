"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck, Brain, FileText, AlertTriangle,
  ArrowRight, Activity, Lock, Globe
} from "lucide-react";

const FEATURES = [
  {
    icon: Activity,
    title: "Live Compound Risk Detection",
    desc: "Fuses gas sensors, active permits, shift data, and maintenance logs into a single 0–100 risk score per zone. Catches dangerous combinations that single sensors miss.",
    color: "#dc2626",
  },
  {
    icon: Brain,
    title: "AI Permit Intelligence",
    desc: "Every permit-to-work request is validated in real-time against live sensor readings and OISD-116 regulations. Dangerous permits are blocked before work begins.",
    color: "#2563eb",
  },
  {
    icon: FileText,
    title: "RAG Incident Intelligence",
    desc: "Query 10 years of Indian steel plant incidents and regulatory standards. Powered by MongoDB Vector Search and Groq — responses in under 5 seconds.",
    color: "#7c3aed",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Response Orchestrator",
    desc: "Auto-generates evacuation plans, DGFASLI-compliant regulatory reports, and dispatches email alerts to safety officers the moment compound risk exceeds critical threshold.",
    color: "#d97706",
  },
];

const STATS = [
  { value: "6,500+", label: "Industrial fatalities per year in India", source: "FICCI" },
  { value: "< 2s", label: "Permit AI verdict response time" },
  { value: "6", label: "Zones monitored simultaneously" },
  { value: "3s", label: "Sensor stream refresh interval" },
];

const SCENARIOS = [
  { tag: "SCENARIO 1", title: "Vizag Coke Oven Gas Leak", desc: "CH₄ rises in Zone B with active PTW — mirrors the January 2025 Visakhapatnam Steel Plant incident pattern. Compound risk reaches 95/100.", color: "#dc2626", bg: "#fef2f2" },
  { tag: "SCENARIO 2", title: "Confined Space + Shift Changeover", desc: "H₂S elevation in Zone D during night shift handover with maintenance crew active — compound HIGH alert generated.", color: "#d97706", bg: "#fffbeb" },
  { tag: "SCENARIO 3", title: "Hot Work Permit Blocked", desc: "Zone C CH₄ at 28% LEL — VIGIL blocks the hot work permit with OISD-116 Section 5.3 citation before a single worker enters the zone.", color: "#2563eb", bg: "#eff6ff" },
];

// Animated counter hook
function useCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 40;
    const step = target / steps;
    let current = 0;
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(iv);
    }, duration / steps);
    return () => clearInterval(iv);
  }, [target, duration]);
  return count;
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f8fafc", color: "#0f172a", overflowX: "hidden" }}>

      {/* ── Google Font ─────────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .fade-in { animation: fadeUp 0.7s ease forwards; opacity: 0; transform: translateY(20px); }
        @keyframes fadeUp { to { opacity: 1; transform: none; } }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .glow-red { animation: glowRed 2.5s ease-in-out infinite; }
        @keyframes glowRed { 0%,100% { box-shadow: 0 0 20px rgba(220,38,38,0.3); } 50% { box-shadow: 0 0 40px rgba(220,38,38,0.6); } }
      `}</style>

      {/* ── Topnav ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 20 ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrollY > 20 ? "blur(12px)" : "none",
        borderBottom: scrollY > 20 ? "1px solid #e2e8f0" : "none",
        transition: "all 0.3s ease",
        padding: "0 40px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={22} color="#dc2626" />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: scrollY > 20 ? "#0f172a" : "#fff" }}>VIGIL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/dashboard" style={{
            fontSize: 13, fontWeight: 700, padding: "8px 20px", borderRadius: 8,
            background: "#1e40af", color: "white", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            Open Platform <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px",
        background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
        position: "relative", overflow: "hidden",
        textAlign: "center",
      }}>
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Red glow orb */}
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)",
          top: "20%", left: "50%", transform: "translateX(-50%)",
          pointerEvents: "none",
        }} />

        {/* Live badge */}
        <div className="fade-in" style={{ animationDelay: "0.1s", marginBottom: 28 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "6px 16px", borderRadius: 99,
            background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)",
            fontSize: 12, fontWeight: 700, color: "#f87171", letterSpacing: "0.06em",
          }}>
            <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
            LIVE INDUSTRIAL SAFETY MONITORING
          </span>
        </div>

        <h1 className="fade-in" style={{
          animationDelay: "0.2s",
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900,
          color: "white", lineHeight: 1.05, letterSpacing: "-0.03em",
          maxWidth: 800, marginBottom: 24,
        }}>
          See Every Risk.<br />
          <span style={{ color: "#f87171" }}>Before It Sees You.</span>
        </h1>

        <p className="fade-in" style={{
          animationDelay: "0.35s",
          fontSize: "clamp(15px, 2vw, 19px)", color: "#94a3b8",
          maxWidth: 580, lineHeight: 1.7, marginBottom: 40,
        }}>
          AI-powered compound risk intelligence for heavy industrial facilities.
          Fuses sensor streams, permit systems, and incident history to prevent
          the accidents that data alone cannot catch.
        </p>

        <div className="fade-in" style={{ animationDelay: "0.45s", display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: "linear-gradient(135deg, #dc2626, #991b1b)",
            color: "white", textDecoration: "none",
            boxShadow: "0 8px 32px rgba(220,38,38,0.4)",
          }}>
            <Activity size={16} /> Open Command Centre
          </Link>
          <a href="#how-it-works" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 28px", borderRadius: 12, fontWeight: 600, fontSize: 15,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
            color: "white", textDecoration: "none",
          }}>
            How It Works
          </a>
        </div>

        {/* Stats row */}
        <div className="fade-in" style={{
          animationDelay: "0.6s", marginTop: 72,
          display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center",
        }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 800, color: "white", fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}
              </p>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 150 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Context Banner ───────────────────────────────────────────────────── */}
      <section style={{ background: "#fef2f2", borderTop: "1px solid #fecaca", borderBottom: "1px solid #fecaca", padding: "20px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
            <strong>Anchored to Reality:</strong> VIGIL's primary demo scenario mirrors the{" "}
            <strong>January 2025 Visakhapatnam Steel Plant incident</strong> — where data was present but unacted upon.
            6,500+ industrial workers die annually in India. VIGIL is the intelligence layer that acts.
          </p>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#2563eb", textTransform: "uppercase" }}>
            Platform Capabilities
          </span>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, marginTop: 10, letterSpacing: "-0.02em" }}>
            Four AI agents. One safety layer.
          </h2>
          <p style={{ fontSize: 16, color: "#64748b", marginTop: 12, maxWidth: 540, margin: "12px auto 0" }}>
            Each agent solves a distinct failure mode from the FICCI/DGFASLI industrial safety report.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card-hover" style={{
              background: "white", borderRadius: 16, padding: 28,
              border: "1px solid #e2e8f0", borderTop: `3px solid ${f.color}`,
              animationDelay: `${i * 100}ms`,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <f.icon size={20} color={f.color} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo Scenarios ───────────────────────────────────────────────────── */}
      <section style={{
        margin: "0 24px 80px", borderRadius: 24,
        background: "#e1e6ebff",
        padding: "72px 40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#dc2626", textTransform: "uppercase" }}>
              Live Demo Scenarios
            </span>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, marginTop: 10, letterSpacing: "-0.02em" }}>
              One click. Real compound risk.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {SCENARIOS.map((s) => (
              <div key={s.title} className="card-hover" style={{
                background: "white", borderRadius: 16, padding: 28,
                border: `1px solid ${s.color}30`,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                  padding: "3px 10px", borderRadius: 99,
                  background: s.bg, color: s.color,
                }}>{s.tag}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 14, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/dashboard" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15,
              background: "#1e40af", color: "white", textDecoration: "none",
            }}>
              Run Scenarios Live <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>


      {/* ── Tech Stack ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Built on enterprise-grade infrastructure
          </h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {[
            "Next.js 16", "TypeScript", "MongoDB Atlas", "Groq API",
            "LangChain.js", "Vector Search", "AWS SES", "AWS S3",
            "Server-Sent Events", "OISD-116 Compliant", "Vercel",
          ].map((t) => (
            <span key={t} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 18px",
              borderRadius: 99, background: "white",
              border: "1px solid #e2e8f0", color: "#334155",
            }}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{
        margin: "0 24px 80px", borderRadius: 24,
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        padding: "72px 40px", textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(220,38,38,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <ShieldCheck size={26} color="#f87171" />
        </div>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 800, color: "white", marginBottom: 16, letterSpacing: "-0.02em" }}>
          Zero harm starts here.
        </h2>
        <p style={{ fontSize: 16, color: "#94a3b8", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Enter the VIGIL Command Centre and activate a real-time industrial safety scenario.
        </p>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "16px 36px", borderRadius: 12, fontWeight: 700, fontSize: 16,
          background: "#dc2626",
          color: "white", textDecoration: "none",
        }}>
          <Activity size={16} /> Open Command Centre
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid #dadfe6ff", padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} color="#dc2626" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>VIGIL</span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>· Vigilant Industrial Guard &amp; Intelligence Layer</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
            <Lock size={10} /> OISD-116 Section 7.1 Compliant
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={10} /> Visakhapatnam Steel Plant, India
          </span>
        </div>
      </footer>
    </div>
  );
}
