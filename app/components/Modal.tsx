"use client";

import { useRef, type ReactNode } from "react";

export function Modal({
  buttonLabel,
  buttonClassName,
  title,
  children,
}: {
  buttonLabel: ReactNode;
  buttonClassName?: string;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => dialogRef.current?.showModal()}>
        {buttonLabel}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          // Native <dialog> puts the backdrop in the same click target as
          // the dialog itself — a click that lands directly on it (not on
          // anything inside) means the backdrop was clicked.
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-full max-w-lg rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-0 text-text-primary shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="text-text-muted hover:text-text-primary"
          >
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </dialog>
    </>
  );
}
