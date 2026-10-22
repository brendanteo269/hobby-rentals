import type { ComponentProps } from "react";
import { ChevronDown, Search } from "lucide-react";

/**
 * One compact control in the marketplace's filter row - a dropdown, the
 * location and date pickers, a toggle - so they all line up at one height and
 * read as a single row of options rather than a form.
 */
export const filterPill =
  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-4 text-sm text-ink outline-none transition-colors hover:border-ink-soft focus-visible:ring-2 focus-visible:ring-accent/40";

/**
 * A dropdown drawn as a filter pill. The browser's own arrow is hidden and
 * replaced by the same chevron, in the same place, as the location and date
 * pills, since the native one sits against the edge and differs per browser.
 * Sized to the option showing rather than the longest one, where the browser
 * supports it; elsewhere it is simply wider.
 */
export function PillSelect({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex">
      <select className={`${filterPill} cursor-pointer appearance-none pr-10 [field-sizing:content] ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
    </span>
  );
}

/**
 * The marketplace's keyword box: one pill with its submit button inside, so
 * the search reads as the main control and the filters below as refinements.
 * Rendered inside the page's GET form, whose other fields it submits too.
 */
export function SearchBar({ label, placeholder, defaultValue }: { label: string; placeholder: string; defaultValue: string }) {
  return (
    <div className="relative">
      <label htmlFor="q" className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="h-14 w-full rounded-full border border-line bg-white pl-14 pr-32 text-base outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ink"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
      >
        Search
      </button>
    </div>
  );
}
