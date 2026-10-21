"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tipSide?: "top" | "bottom";
  active?: boolean;
}

/** Round icon button with a hover tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tipSide = "bottom", active, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cx(
        "group relative h-10 w-10 grid place-items-center rounded-full text-ink/75 transition",
        "hover:bg-ink/[0.06] hover:text-ink active:scale-95 disabled:opacity-35 disabled:pointer-events-none",
        active && "bg-ink/[0.07] text-ink",
        className,
      )}
      {...rest}
    >
      {children}
      <Tip side={tipSide}>{label}</Tip>
    </button>
  );
});

export function Tip({ children, side = "bottom" }: { children: ReactNode; side?: "top" | "bottom" }) {
  return (
    <span
      className={cx(
        "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white",
        "opacity-0 scale-95 transition duration-150 group-hover:opacity-100 group-hover:scale-100 group-hover:delay-300 z-50",
        side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" className={className} aria-hidden>
      <rect x="9" y="5" width="18" height="22" rx="5" fill="currentColor" opacity="0.18" transform="rotate(10 18 16)" />
      <rect x="6" y="5" width="18" height="22" rx="5" fill="currentColor" />
      <rect x="10" y="17" width="10" height="2.6" rx="1.3" fill="var(--color-paper)" />
      <rect x="10" y="21.2" width="6.5" height="2.6" rx="1.3" fill="var(--color-paper)" opacity="0.6" />
    </svg>
  );
}
