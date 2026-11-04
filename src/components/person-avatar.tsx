import Image from "next/image";

/** Tailwind size and initial's text size, with the rendered px for next/image. */
const SIZES = {
  sm: { className: "size-6 text-xs", px: 24 },
  md: { className: "size-9 text-sm", px: 36 },
  lg: { className: "size-14 text-xl", px: 56 },
  xl: { className: "size-24 text-3xl", px: 96 },
} as const;

export type PersonAvatarSize = keyof typeof SIZES;

/**
 * A member's face: their profile photo when they have one, their initial in
 * a circle when they do not. Decorative (aria-hidden) everywhere it is used,
 * since the name is always written beside it.
 *
 * Takes the name rather than a ready-made initial so no call site repeats
 * that logic; the header passes the email in place of a missing name.
 */
export function PersonAvatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string | null;
  imageUrl?: string | null;
  size?: PersonAvatarSize;
}) {
  const { className, px } = SIZES[size];
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        aria-hidden="true"
        width={px}
        height={px}
        className={`shrink-0 rounded-full bg-surface-muted object-cover ${className}`}
      />
    );
  }

  const initial = (name ?? "Member").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold uppercase text-white ${className}`}
    >
      {initial}
    </span>
  );
}
