"use client";

/**
 * Onboarding birthdate capture — a real `<input type="date">` so the public
 * profile can derive an `age` for the existing "Show age" privacy toggle.
 *
 * Kept in its own component (rather than inline in page.tsx) to respect the
 * frozen page.tsx size ratchet. The raw date is never sent to another user —
 * only the derived age, and only when the owner's preference allows it.
 */
export function OnboardingBirthdateField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "block", width: "100%", textAlign: "left" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
        Birthdate
      </span>
      <input
        className="inp"
        type="date"
        aria-label="Birthdate"
        max={new Date().toISOString().slice(0, 10)}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default OnboardingBirthdateField;
