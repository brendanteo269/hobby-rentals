import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/** Page-width container for the marketplace's wider card grids. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-6 ${className}`}>{children}</div>;
}

/** Section heading with an optional link on the right. */
export function SectionHead({ title, href, linkLabel }: { title: string; href?: Route; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="heading text-2xl sm:text-3xl">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="eyebrow hover:text-ink transition-colors">
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

type ButtonProps = { variant?: "accent" | "solid" | "outline" | "outlineOnDark"; className?: string; children: ReactNode };

const buttonBase =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:opacity-60";

const buttonVariants = {
  accent: "bg-accent text-white hover:bg-accent-dark",
  solid: "bg-ink text-white hover:bg-ink/90",
  outline: "border border-line bg-white text-ink hover:bg-surface-muted",
  /** Bordered button for dark sections (footer, dark cards) — a separate
   * variant rather than an `outline` override, since overriding conflicting
   * border/bg/text utilities via className fights the base variant's own
   * classes and can lose depending on Tailwind's generated CSS order. */
  outlineOnDark: "border border-white/40 bg-transparent text-white hover:bg-white/10",
};

export function Button({ variant = "accent", className = "", children, ...props }: ButtonProps & ComponentProps<"button">) {
  return (
    <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/**
 * Generic over the route the same way Link is. `ComponentProps<typeof Link>`
 * on its own collapses Link's route parameter to `unknown`, which typed
 * routes then reject for any dynamic href - so a plain wrapper could link to
 * `/listings/new` but never to `/listings/${id}/edit`.
 */
export function ButtonLink<T extends string>({
  variant = "accent",
  className = "",
  children,
  href,
  ...props
}: ButtonProps & Omit<ComponentProps<typeof Link>, "href"> & { href: Route<T> }) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

const inputBase =
  "w-full border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft";

/** Bare text input carrying the shared field styling. `pill` is for search-bar-style contexts (hero, filter bars); form fields stay `rounded-lg`. */
export function Input({ className = "", pill = false, ...props }: ComponentProps<"input"> & { pill?: boolean }) {
  return <input className={`${inputBase} ${pill ? "rounded-full" : "rounded-lg"} ${className}`} {...props} />;
}

export function Select({ className = "", pill = false, ...props }: ComponentProps<"select"> & { pill?: boolean }) {
  return <select className={`${inputBase} ${pill ? "rounded-full" : "rounded-lg"} ${className}`} {...props} />;
}

/** Marks a label as required, so it reads before a glance reaches the control. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-accent">
      {" "}
      *
    </span>
  );
}

type FieldShell = {
  label: string;
  /** Guidance shown under the control, such as an accepted format. */
  hint?: string;
  /**
   * Message for this field, shown in place of the hint. Forms that validate
   * server-side pass the entry the backend returned for this field; a form
   * with a single whole-form error still renders that itself.
   */
  error?: string;
};

/**
 * Label, control, and the one line under it.
 *
 * Wraps every field type so the error wiring (aria-invalid, aria-describedby,
 * and the error replacing the hint) is written once instead of three times.
 */
function FieldWrapper({
  label,
  hint,
  error,
  id,
  required,
  children,
}: FieldShell & { id?: string; required?: boolean; children: ReactNode }) {
  const messageId = id ? `${id}-message` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {(error ?? hint) && (
        <p
          id={messageId}
          {...(error ? { role: "alert" } : {})}
          className={`mt-2 text-xs ${error ? "text-accent-dark" : "text-ink-soft"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/**
 * Points the control at its message, but only when one is actually rendered —
 * an aria-describedby naming an element that does not exist is worse than none.
 */
function messageProps(shell: FieldShell & { id?: string }) {
  const hasMessage = Boolean(shell.error ?? shell.hint);
  return {
    "aria-invalid": shell.error ? true : undefined,
    "aria-describedby": hasMessage && shell.id ? `${shell.id}-message` : undefined,
  };
}

export function Field({
  label,
  hint,
  error,
  id,
  required,
  className = "",
  ...props
}: FieldShell & ComponentProps<"input">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id} required={required}>
      <Input
        id={id}
        required={required}
        className={`mt-2 ${className}`}
        {...messageProps({ label, hint, error, id })}
        {...props}
      />
    </FieldWrapper>
  );
}

/** Labelled textarea, styled to match Field. */
export function TextareaField({
  label,
  hint,
  error,
  id,
  required,
  className = "",
  ...props
}: FieldShell & ComponentProps<"textarea">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id} required={required}>
      <textarea
        id={id}
        required={required}
        className={`${inputBase} rounded-lg mt-2 resize-y ${className}`}
        {...messageProps({ label, hint, error, id })}
        {...props}
      />
    </FieldWrapper>
  );
}

/** Labelled select, styled to match Field. */
export function SelectField({
  label,
  hint,
  error,
  id,
  required,
  className = "",
  children,
  ...props
}: FieldShell & ComponentProps<"select">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id} required={required}>
      <Select
        id={id}
        required={required}
        className={`mt-2 ${className}`}
        {...messageProps({ label, hint, error, id })}
        {...props}
      >
        {children}
      </Select>
    </FieldWrapper>
  );
}

type BadgeVariant = "neutral" | "accent" | "dark";

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "border border-line bg-white/95 text-ink",
  accent: "bg-accent-soft text-accent-dark",
  dark: "bg-ink text-white",
};

/** Small pill label — location tags, filter chips, marketing ribbons. */
export function Badge({
  variant = "neutral",
  className = "",
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Toggle pill — the "selected / unselected" control repeated across price
 * blocks, weekday pickers, duration toggles and filter bars. One primitive
 * instead of each caller hand-rolling the same two-state style.
 */
const chipSizes = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

export function Chip({
  selected = false,
  size = "md",
  className = "",
  children,
  ...props
}: {
  selected?: boolean;
  /** "sm" for a dense row (filter bars); "md" everywhere else. */
  size?: keyof typeof chipSizes;
  className?: string;
  children: ReactNode;
} & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex items-center justify-center rounded-full border font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 ${chipSizes[size]} ${
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink-soft hover:border-ink hover:text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Shown where a list would be, when the list is empty. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card px-6 py-16 text-center">
      <p className="heading text-base">{title}</p>
      <p className="body-copy mx-auto mt-2 max-w-sm">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export type NoticeTone = "error" | "success";

const noticeTones: Record<NoticeTone, string> = {
  error: "border-accent bg-accent-soft",
  success: "border-success bg-success-soft",
};

/**
 * A standing message about the page as a whole — "your session expired", "your
 * email is confirmed".
 *
 * The role differs by tone on purpose. `alert` interrupts a screen reader
 * immediately, which is right for a failure and wrong for a confirmation the
 * member is simply arriving at; `status` is announced without cutting in.
 */
export function FormNotice({ message, tone = "error" }: { message?: string; tone?: NoticeTone }) {
  if (!message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border-l-2 px-3 py-2 text-sm text-ink ${noticeTones[tone]}`}
    >
      {message}
    </p>
  );
}

/** A form's overall outcome, as opposed to a message against one field. */
export function FormError({ message }: { message?: string }) {
  return <FormNotice message={message} tone="error" />;
}

/**
 * Fixed-overlay modal shared by the wallet flows. Closes on a click outside
 * the panel; callers own their own step/error state.
 */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto card p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="heading text-xl">
            {title}
          </h2>
          <button className="text-ink-soft hover:text-ink" aria-label="Close dialog" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * A listing/hero photo, or — until one exists — a labelled placeholder box.
 * `src` is optional on purpose: a listing with no uploaded photos has none
 * to show (see `ListingCard.primary_photo_url` in `lib/listings.ts`), so
 * callers pass a photo URL where they have one and fall back to the label
 * otherwise, without the two cases needing separate components.
 */
export function ImageSlot({
  label,
  src,
  align = "center",
  className = "",
}: {
  label: string;
  src?: string;
  /** "end" keeps the caption clear of content overlaid on the slot. */
  align?: "center" | "end";
  className?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-surface-muted ${className}`}>
        <Image src={src} alt={label} fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" />
      </div>
    );
  }

  const position =
    align === "end" ? "items-end justify-end p-4" : "items-center justify-center px-4";
  return (
    <div className={`flex bg-surface-muted ${position} ${className}`}>
      <span className="text-center text-xs text-ink-soft">{label}</span>
    </div>
  );
}
