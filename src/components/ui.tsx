import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Page-width container. Matches the wireframe's narrow editorial measure. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>{children}</div>;
}

/** Section heading with an optional link on the right. */
export function SectionHead({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="display-caps text-2xl sm:text-3xl">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="eyebrow hover:text-ink transition-colors">
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

type ButtonProps = { variant?: "solid" | "outline"; className?: string; children: ReactNode };

const buttonBase =
  "inline-flex items-center justify-center rounded-sm px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-60";

const buttonVariants = {
  solid: "bg-ink text-cream hover:bg-ink-soft",
  outline: "border border-line bg-transparent text-ink hover:bg-sand",
};

export function Button({ variant = "solid", className = "", children, ...props }: ButtonProps & ComponentProps<"button">) {
  return (
    <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "solid", className = "", children, ...props }: ButtonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/**
 * Stands in for photography that hasn't been shot yet. The wireframe marks
 * these slots too — swap for next/image once real assets exist.
 */
export function ImageSlot({
  label,
  align = "center",
  className = "",
}: {
  label: string;
  /** "end" keeps the caption clear of content overlaid on the slot. */
  align?: "center" | "end";
  className?: string;
}) {
  const position =
    align === "end" ? "items-end justify-end p-4" : "items-center justify-center px-4";
  return (
    <div className={`flex bg-stone ${position} ${className}`}>
      <span className="text-center text-xs text-ink-soft">{label}</span>
    </div>
  );
}
