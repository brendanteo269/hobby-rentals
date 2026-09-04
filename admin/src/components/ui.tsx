import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { StatusTone } from "@/lib/users";

/** Page-width container. Wider than the public site: this one holds tables. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-6 ${className}`}>{children}</div>;
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

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  id,
  ...props
}: { label: string; hint?: string } & ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <Input id={id} className="mt-2" {...props} />
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

// The dot carries the colour so the pill itself stays quiet. An admin console
// shows a lot of statuses at once, and colouring every pill turns the page
// into bunting.
const toneDots: Record<StatusTone, string> = {
  positive: "bg-ok",
  warning: "bg-warn",
  critical: "bg-bad",
  neutral: "bg-ink-soft",
};

export function Badge({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs whitespace-nowrap text-ink">
      <span className={`size-1.5 rounded-full ${toneDots[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Panel with a heading; the unit every admin screen is built from. */
export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-line bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h2 className="display-caps text-lg">{title}</h2>
          {description && <p className="body-copy mt-1">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/** Label/value pairs, used for account facts that are read but not edited. */
export function DescriptionList({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map(({ term, value }) => (
        <div key={term}>
          <dt className="eyebrow">{term}</dt>
          <dd className="mt-1.5 text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="display-caps text-base">{title}</p>
      <p className="body-copy mx-auto mt-2 max-w-sm">{body}</p>
    </div>
  );
}

/** Renders the outcome of a form, success or failure. */
export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (!state?.error && !state?.success) return null;
  const isError = Boolean(state.error);
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`border-l-2 px-3 py-2 text-sm text-ink ${
        isError ? "border-bad bg-sand" : "border-ok bg-sand"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}
