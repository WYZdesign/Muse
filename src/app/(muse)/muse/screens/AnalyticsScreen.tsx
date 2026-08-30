"use client";

import React, { memo, useEffect, useState } from "react";
import { FiArrowLeft, FiEye, FiHeart, FiMessageSquare, FiFileText, FiCalendar, FiDollarSign, FiTrendingUp, FiUsers } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";

interface AnalyticsScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  currentUser: any;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
  openHamburger: () => void;
  unreadNotificationCount?: number;
}

export const AnalyticsScreen = memo(function AnalyticsScreen({
  screen,
  showScreen,
  currentUser,
  apiFetch,
  showToast,
  openHamburger,
  unreadNotificationCount,
}: AnalyticsScreenProps) {
  const [analytics, setAnalytics] = useState<{
    views: number;
    viewsLast30Days: number;
    matchesReceived: number;
    messagesSent: number;
    briefApplications: number;
    bookingsAsHost: number;
    bookingsAsBooker: number;
    totalEarningsCents: number;
    totalEarningsUsd: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiFetch("/api/muse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "my-analytics" }),
        });
        const data = await res.json();
        if (data) setAnalytics(data);
      } catch (e) {
        showToast("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [apiFetch, showToast]);

  const statCards = [
    { label: "Profile Views", value: analytics?.views?.toLocaleString() || "0", icon: FiEye, color: "#FFD700", trend: analytics?.viewsLast30Days ? `+${analytics.viewsLast30Days} (30d)` : null },
    { label: "Matches Received", value: analytics?.matchesReceived?.toLocaleString() || "0", icon: FiHeart, color: "#FF69B4", trend: null },
    { label: "Messages Sent", value: analytics?.messagesSent?.toLocaleString() || "0", icon: FiMessageSquare, color: "#87CEEB", trend: null },
    { label: "Quest Applications", value: analytics?.briefApplications?.toLocaleString() || "0", icon: FiFileText, color: "#90caf9", trend: null },
    { label: "Bookings (Host)", value: analytics?.bookingsAsHost?.toLocaleString() || "0", icon: FiCalendar, color: "#98FB98", trend: null },
    { label: "Bookings (Booker)", value: analytics?.bookingsAsBooker?.toLocaleString() || "0", icon: FiUsers, color: "#D4A5FF", trend: null },
    { label: "Total Earnings", value: `$${analytics?.totalEarningsUsd || "0.00"}`, icon: FiDollarSign, color: "#FF8A80", trend: null },
  ];

  if (loading) {
    return (
      <div className={"screen-el" + (screen === "analytics" ? " active" : "")} style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <div className="hdr" style={{ borderBottom: "1px solid rgba(233,30,99,0.15)" }}>
          <button className="chat-back" onClick={() => showScreen("profile")}><FiArrowLeft size={20} /></button>
          <div className="logo-link" style={{ fontSize: 32, backgroundImage: "linear-gradient(120deg,#CE93D8,#F48FB1,#BA68C8,#CE93D8)", backgroundSize: "300% 300%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", fontWeight: 900 }}>Analytics</div>
          <div style={{ width: 42 }} />
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--muted)" }}>Loading analytics…</div>
      </div>
    );
  }

  return (
    <div className={"screen-el" + (screen === "analytics" ? " active" : "")} style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div className="hdr" style={{ borderBottom: "1px solid rgba(233,30,99,0.15)" }}>
        <button className="chat-back" onClick={() => showScreen("profile")}><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{ fontSize: 32, backgroundImage: "linear-gradient(120deg,#CE93D8,#F48FB1,#BA68C8,#CE93D8)", backgroundSize: "300% 300%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", fontWeight: 900 }}>Analytics</div>
        <button onClick={openHamburger} style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}><FiUsers size={24} style={{ color: "var(--text)" }} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>
        <div style={{ marginBottom: 20, padding: "0 4px" }}>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 8 }}>Last 30 days</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {statCards.map((stat, i) => (
              <div key={stat.label} style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                borderLeft: `4px solid ${stat.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{stat.value}</div>
                {stat.trend && <div style={{ fontSize: 11, color: stat.color, fontWeight: 600 }}>{stat.trend}</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20, padding: "0 4px" }}>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Quick Actions</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => showScreen("profile")} className="btn btn-gold" style={{ flex: 1, minWidth: 140 }}>View Profile</button>
            <button onClick={() => showScreen("sessions")} className="btn btn-outline" style={{ flex: 1, minWidth: 140 }}>Manage Sessions</button>
            <button onClick={() => showScreen("briefs")} className="btn btn-outline" style={{ flex: 1, minWidth: 140 }}>View Quests</button>
            <button onClick={() => showScreen("portfolio")} className="btn btn-outline" style={{ flex: 1, minWidth: 140 }}>Edit Portfolio</button>
          </div>
        </div>

        <div style={{ padding: "0 4px" }}>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>About Your Analytics</div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li><strong>Profile Views</strong> — Total lifetime views + last 30 days from activity log</li>
              <li><strong>Matches Received</strong> — Users who matched with you (you swiped right on them too)</li>
              <li><strong>Messages Sent</strong> — Total messages you've sent in chat</li>
              <li><strong>Quest Applications</strong> — Times you've applied to creative quests</li>
              <li><strong>Bookings (Host)</strong> — Sessions you've hosted and completed</li>
              <li><strong>Bookings (Booker)</strong> — Sessions you've booked with other creatives</li>
              <li><strong>Total Earnings</strong> — Net payouts from completed bookings (after 5% platform fee)</li>
            </ul>
          </div>
        </div>
      </div>

      <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default AnalyticsScreen;