import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";

/** Page-width container. Matches the wireframe's narrow editorial measure. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>{children}</div>;
}

/** Section heading with an optional link on the right. */
export function SectionHead({ title, href, linkLabel }: { title: string; href?: Route; linkLabel?: string }) {
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

const inputBase =
  "w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";

/** Bare text input carrying the shared field styling. */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputBase} ${className}`} {...props} />;
}

/** Marks a label as required, so it reads before a glance reaches the control. */
function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-clay">
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
          className={`mt-2 text-xs ${error ? "text-clay" : "text-ink-soft"}`}
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
  ...props
}: FieldShell & ComponentProps<"input">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id} required={required}>
      <Input
        id={id}
        required={required}
        className="mt-2"
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
        className={`${inputBase} mt-2 resize-y ${className}`}
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
  children,
  ...props
}: FieldShell & ComponentProps<"select">) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={id} required={required}>
      <Select
        id={id}
        required={required}
        className="mt-2"
        {...messageProps({ label, hint, error, id })}
        {...props}
      >
        {children}
      </Select>
    </FieldWrapper>
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
    <div className="border border-line bg-white px-6 py-16 text-center">
      <p className="display-caps text-base">{title}</p>
      <p className="body-copy mx-auto mt-2 max-w-sm">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** A form's overall outcome, as opposed to a message against one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border-l-2 border-clay bg-sand px-3 py-2 text-sm text-ink">
      {message}
    </p>
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
