"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ClipboardList, Brain,
  AlertOctagon, Building2, Menu, X
} from "lucide-react";

const NAV = [
  {
    section: "OPERATIONS", items: [
      { label: "Command Centre", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Permit Intelligence", icon: ClipboardList, href: "/permits" },
    ]
  },
  {
    section: "INTELLIGENCE", items: [
      { label: "Incident Intelligence", icon: Brain, href: "/intelligence" },
      { label: "Emergency Response", icon: AlertOctagon, href: "/emergency" },
    ]
  },
];

export default function Sidebar() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [path]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, textDecoration: "none", cursor: "pointer" }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.02em" }}>
                VIGIL
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, lineHeight: 1 }}>
                See Every Risk. Before It Sees You.
              </p>
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="anim-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#4ade80" }}>Live Monitoring Active</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8, overflowY: "auto" }}>
          {NAV.map((g) => (
            <div key={g.section}>
              <p className="nav-label">{g.section}</p>
              {g.items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}
                    className={`nav-link ${active ? "active" : ""}`}>
                    <item.icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Building2 size={13} color="rgba(255,255,255,0.35)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Visakhapatnam Steel
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 3, lineHeight: 1 }}>
                Coke Oven Battery
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>All systems operational</span>
          </div>
        </div>
      </aside>

      {/* ── Floating hamburger (mobile/tablet only) ─────────────────────── */}
      <button
        className="mobile-menu-fab"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} color="white" />
      </button>

      {/* ── Slide-in drawer ─────────────────────────────────────────────── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, backdropFilter: "blur(2px)" }}
          />

          {/* Drawer */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(280px, 85vw)",
            background: "#0c1220", zIndex: 201,
            display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
          }}>
            {/* Header */}
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "#ffffff", lineHeight: 1 }}>VIGIL</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>See Every Risk. Before It Sees You.</p>
                </div>
              </Link>
              <button onClick={() => setMenuOpen(false)}
                style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(255,255,255,0.07)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={14} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            {/* Live chip */}
            <div style={{ margin: "10px 14px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="anim-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#4ade80" }}>Live Monitoring Active</span>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, paddingTop: 4, overflowY: "auto" }}>
              {NAV.map((g) => (
                <div key={g.section}>
                  <p className="nav-label">{g.section}</p>
                  {g.items.map((item) => {
                    const active = path === item.href || path.startsWith(item.href + "/");
                    return (
                      <Link key={item.href} href={item.href}
                        className={`nav-link ${active ? "active" : ""}`}
                        onClick={() => setMenuOpen(false)}>
                        <item.icon size={15} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={13} color="rgba(255,255,255,0.35)" />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>Visakhapatnam Steel</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 3, lineHeight: 1 }}>Coke Oven Battery</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>All systems operational</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
