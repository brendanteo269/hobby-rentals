const SIZE_CLASSES = {
  sm: "size-6 text-xs",
  md: "size-9 text-sm",
} as const;

/**
 * Initials circle for the other party in a conversation - name, not email
 * (unlike AccountMenu's header avatar, which has only an email in scope via
 * site-header.tsx and is a separate, pre-existing contract this doesn't
 * touch). Every messaging surface already has other_party_name on hand, so
 * this takes the name directly and computes its own initial rather than
 * making each call site repeat that logic.
 */
export function PersonAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" }) {
  const initial = (name ?? "Member").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold uppercase text-white ${SIZE_CLASSES[size]}`}
    >
      {initial}
    </span>
  );
}
