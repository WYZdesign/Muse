"use client";
import React, { useEffect, useRef, useCallback } from "react";

/**
 * Accessible focus-trap modal primitive.
 * - Traps Tab/Shift+Tab inside the container
 * - Closes on Escape (if dismissible)
 * - Restores focus to the opener on close
 * - Sets inert + aria-hidden on all background siblings
 *
 * Usage:
 *   <FocusTrap open={show} onClose={() => setShow(false)} label="Report content">
 *     <div>...modal content...</div>
 *   </FocusTrap>
 */
export default function FocusTrap({
  open,
  onClose,
  label,
  labelledBy,
  children,
  dismissible = true,
  initialFocusRef,
  className,
  style,
  onBackdropClick,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  className?: string;
  style?: React.CSSProperties;
  onBackdropClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Save the element that had focus before the modal opened
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement as HTMLElement;
      // Inert all siblings of the phone container and other overlays
      const phone = document.getElementById("muse-app");
      if (phone) {
        Array.from(phone.parentElement?.children || []).forEach((sib) => {
          if (sib !== phone && sib instanceof HTMLElement) {
            sib.setAttribute("inert", "");
            sib.setAttribute("aria-hidden", "true");
          }
        });
      }
    }
    return () => {
      if (!open) return;
      const phone = document.getElementById("muse-app");
      if (phone) {
        Array.from(phone.parentElement?.children || []).forEach((sib) => {
          if (sib !== phone && sib instanceof HTMLElement) {
            sib.removeAttribute("inert");
            sib.removeAttribute("aria-hidden");
          }
        });
      }
    };
  }, [open]);

  // Focus the initial element when modal opens
  useEffect(() => {
    if (!open) return;
    const timer = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusable = containerRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [open, initialFocusRef]);

  // Restore focus on close
  useEffect(() => {
    if (open) return;
    const frame = requestAnimationFrame(() => {
      openerRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Focus trap via Tab/Shift+Tab
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, dismissible]
  );

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onBackdropClick?.(event);
      }}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
