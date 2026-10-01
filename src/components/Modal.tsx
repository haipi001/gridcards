"use client";

// One dialog for the whole app. The CSS (.overlay / .modal / .close) already
// existed but nothing used it — this gives it the keyboard and scroll behaviour
// a modal needs: Escape closes, the background stops scrolling, and focus lands
// inside instead of behind the overlay.

import { useEffect, useRef } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`overlay${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={boxRef}
        className={`modal${open ? " open" : ""}${wide ? " modalWide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <button className="close" type="button" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <h2>{title}</h2>
        <div className="modalBody">{children}</div>
        {footer ? <div className="modalFoot">{footer}</div> : null}
      </div>
    </>
  );
}
