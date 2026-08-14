import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #0a0612, #1a0a2e)",
        color: "#f5f0ff",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 84, fontWeight: 800, background: "linear-gradient(120deg, #FFD700, #FFBF00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        404
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 26, margin: "12px 0 8px" }}>
        This page wandered off
      </h1>
      <p style={{ color: "rgba(255,255,255,0.55)", maxWidth: 380, lineHeight: 1.6, marginBottom: 28 }}>
        The creative you&apos;re looking for isn&apos;t here — but your next collaboration is.
      </p>
      <Link
        href="/muse"
        style={{
          padding: "14px 32px",
          borderRadius: 16,
          background: "linear-gradient(120deg, #FFD700, #FFBF00)",
          color: "#0a0612",
          fontWeight: 800,
          textDecoration: "none",
          fontSize: 15,
        }}
      >
        Back to Muse
      </Link>
    </div>
  );
}
