import type { CSSProperties, PointerEvent, SyntheticEvent } from "react";
import Image from "next/image";
import { FiX } from "react-icons/fi";
import type { Match } from "./types";
import type { MatchVariant } from "../page-constants";

type MatchOverlayProps = {
  match: Match;
  variant: MatchVariant;
  currentUserAvatar: string;
  confettiPieces: (CSSProperties & Record<"--drift" | "--rot", string>)[];
  onClose: () => void;
  onMessage: () => void;
  onImageError: (_event: SyntheticEvent<HTMLImageElement>) => void;
};

export function MatchOverlay({
  match,
  variant,
  currentUserAvatar,
  confettiPieces,
  onClose,
  onMessage,
  onImageError,
}: MatchOverlayProps) {
  const closeOnBackdrop = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="match-overlay"
      style={{
        "--match-grad": variant.gradient,
        "--match-particle-color": variant.particleColor,
      } as CSSProperties & Record<"--match-grad" | "--match-particle-color", string>}
      role="dialog"
      aria-modal="true"
      aria-label={variant.title}
      onPointerDown={closeOnBackdrop}
    >
      <button className="match-overlay-close" onClick={onClose} aria-label="Close match overlay"><FiX size={22} /></button>
      {confettiPieces.map((piece, index) => <div key={index} className="confetti-piece" style={piece} />)}
      <div className="match-particles" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="match-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              fontSize: `${10 + Math.random() * 18}px`,
            }}
          >
            {variant.particles[index % variant.particles.length]}
          </span>
        ))}
      </div>
      <div className="match-title">
        <span className="match-title-symbol">{variant.symbol}</span>
        {variant.title}
      </div>
      <div className="match-subtitle">You and <strong style={{ color: "var(--gold)" }}>{match.name}</strong> are both ready to collaborate.</div>
      <div className="match-disclaimer">Muse is for finding and booking creative collaborators, not a dating app.</div>
      <div className="match-avatars">
        <Image loading="lazy" className="match-av" src={currentUserAvatar} alt="You" width={80} height={80} />
        <Image loading="lazy" className="match-av" src={match.img} alt={match.name} width={80} height={80} onError={onImageError} />
      </div>
      <button className="match-btn" onClick={onMessage}>Send a Message</button>
    </div>
  );
}
