import StreakWidget from "./StreakWidget";
import { useFocusTrap } from "../hooks/useFocusTrap";

type DailyLoginModalProps = {
  name: string;
  creativeType: string;
  weeklyLogins: boolean[];
  loginStreak: number;
  onClose: () => void;
  onViewQuests: () => void;
};

export function DailyLoginModal({
  name,
  creativeType,
  weeklyLogins,
  loginStreak,
  onClose,
  onViewQuests,
}: DailyLoginModalProps) {
  const firstName = name ? `, ${name.split(" ")[0]}` : "";
  const prompt = creativeType
    ? `As a ${creativeType}, check your quests and claim rewards`
    : "Check your quests and claim rewards";

  // Real dialog semantics: focus is moved in, Tab is trapped, background branch
  // is inert, Escape closes, and focus is restored on close. Previously this was
  // a bare `role="presentation"` overlay with no trap or Escape handling.
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);

  return (
    <div className="daily-login-overlay" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className="daily-login-card"
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-login-title"
      >
        <div className="daily-login-title" id="daily-login-title">Welcome back{firstName}!</div>
        <StreakWidget weeklyLogins={weeklyLogins} loginStreak={loginStreak} />
        <div className="daily-login-sub">{prompt}</div>
        <button className="daily-login-btn" onClick={onViewQuests}>View Quests</button>
        <button className="daily-login-dismiss" onClick={onClose}>Later</button>
      </div>
    </div>
  );
}
