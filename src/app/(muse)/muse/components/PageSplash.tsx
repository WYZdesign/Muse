import Image from "next/image";

/** Initial loading shell, kept independent from the stateful Muse controller. */
export function PageSplash() {
  return (
    <div style={{ display: "contents" }}>
      <div className="splash-scene">
        <div className="splash-sky" />
        <div className="splash-overlay" />
        <div className="splash-stars">
          {Array.from({ length: 36 }).map((_, index) => (
            <span
              key={index}
              className="splash-star"
              style={{
                left: `${(index * 37) % 100}%`,
                top: `${(index * 13) % 45}%`,
                animationDelay: `${(index % 8) * 0.4}s`,
              }}
            />
          ))}
        </div>
        <div className="splash-meteor sm-1" />
        <div className="splash-meteor sm-2" />
        <div className="splash-meteor sm-3" />
        <div className="splash-nebula sbn-1" />
        <div className="splash-nebula sbn-2" />
        <div className="splash-nebula sbn-3" />
        <div className="splash-sun-glow" />
        <div className="splash-sun" />
        <div className="splash-cloud spc-1" />
        <div className="splash-cloud spc-2" />
        <div className="splash-cloud spc-3" />
        <div className="splash-ocean splash-ocean-tide">
          <svg className="splash-tide" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
            <path className="wave-path-1" d="M0,90 C120,130 260,60 420,86 C560,108 640,40 800,84 C950,124 1060,58 1200,88 C1300,108 1370,72 1440,92 L1440,160 L0,160 Z" />
          </svg>
          <svg className="splash-tide" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
            <path className="wave-path-2" d="M0,110 C150,70 300,130 470,96 C620,68 760,128 930,102 C1060,82 1180,124 1300,98 C1360,86 1400,108 1440,100 L1440,160 L0,160 Z" />
          </svg>
          <svg className="splash-tide" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
            <path className="wave-path-3" d="M0,72 C170,116 340,58 520,92 C660,118 820,66 980,96 C1120,120 1240,74 1360,96 L1440,108 L1440,160 L0,160 Z" />
          </svg>
        </div>
      </div>
      <div className="splash-content">
        <Image src="/muse-app-icon.png" alt="" width={120} height={120} className="splash-logo-icon" />
        <div className="splash-logo-text">Muse</div>
        <div className="splash-tagline" style={{ whiteSpace: "nowrap" }}>Where Creatives Connect</div>
        <div className="splash-loader"><div className="splash-loader-bar" /></div>
      </div>
    </div>
  );
}
