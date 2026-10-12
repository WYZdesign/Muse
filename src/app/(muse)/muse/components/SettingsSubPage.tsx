// Shared bottom-sheet wrapper for every Settings sub-page (Notifications,
// Connected Accounts, Change Password, Blocked Users, MFA, etc). Matches the
// app's existing slide-up panel convention (quest-panel, hamburger
// sub-screens) instead of the old pattern of pushing an accordion open
// inline in the middle of the settings list — that kept growing the list's
// scroll height every time someone opened a section, and buried short rows
// in a long column. A sub-page keeps the main list a fixed, scannable length
// and gives each section its own focused screen with one clear way back.
"use client";

import React from "react";
import { FiX } from "react-icons/fi";
import { useFocusTrap } from "../hooks/useFocusTrap";

export function SettingsSubPage({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Buttery slide: mount -> slide up; close -> slide back down, THEN unmount.
  // The parent still renders us conditionally, so we hold ourselves on screen
  // for the exit animation before calling the real onClose.
  const [closing, setClosing] = React.useState(false);
  const requestClose = React.useCallback(() => {
    setClosing((c) => {
      if (c) return c;
      window.setTimeout(onClose, 280);
      return true;
    });
  }, [onClose]);
  const trapRef = useFocusTrap(true, requestClose);

  return (
    <div
      ref={trapRef}
      className={"sheet-overlay" + (closing ? " closing" : "")}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={requestClose}
    >
      <div className={"sheet-panel" + (closing ? " closing" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button onClick={requestClose} aria-label={`Close ${title}`} className="sheet-close"><FiX size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
