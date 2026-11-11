/**
 * S6-01: the shapes and wording of the meetup clash check, shared by the
 * warning dialog and its tests. The rules themselves live on the server
 * (app/meetup_conflict_service.py); this only turns its answer into copy.
 */

/** Mirrors `ConflictCheck` in app/meetup_conflict_service.py. */
export type MeetupConflictCheck = {
  /** A hard stop (the owner is away) - the meetup cannot be arranged at all. */
  blocked_reason: string | null;
  times: MeetupTimeConflict[];
};

export type MeetupTimeConflict = {
  time: string;
  /** The viewer's own conflicting meetup - their own data. */
  own_clash: { item_name: string; time: string } | null;
  /** Only the fact: never the other person's item, time or booking. */
  other_party_clash: boolean;
  /** Up to three nearby slots that suit both people, as ISO instants. */
  suggestions: string[];
};

export const OTHER_PARTY_CLASH_MESSAGE =
  "This time doesn't suit the other party";

/** Handovers are all in Singapore, so a time of day is always read in SGT. */
const MARKETPLACE_TIME_ZONE = "Asia/Singapore";

/** "10:00" - the 24-hour clock time of an instant in Singapore. */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MARKETPLACE_TIME_ZONE,
  });
}

/** The message naming the viewer's own clashing meetup. */
export function ownClashMessage(itemName: string, iso: string): string {
  return `Clashes with your meetup for ${itemName} at ${formatClockTime(iso)}`;
}

/** The time-of-day value (`TIME_OF_DAY_OPTIONS` format) of an instant, for dropping a suggestion into the form. */
export function toTimeOfDayValue(iso: string): string {
  return formatClockTime(iso);
}

/** The warning lines for one time, in the order they should be shown. */
export function conflictMessages(conflict: MeetupTimeConflict): string[] {
  const lines: string[] = [];
  if (conflict.own_clash)
    lines.push(
      ownClashMessage(conflict.own_clash.item_name, conflict.own_clash.time),
    );
  if (conflict.other_party_clash) lines.push(OTHER_PARTY_CLASH_MESSAGE);
  return lines;
}

/** The times that clash, i.e. the ones the warning is about. */
export function clashingTimes(
  check: MeetupConflictCheck,
): MeetupTimeConflict[] {
  return check.times.filter(
    (entry) => entry.own_clash || entry.other_party_clash,
  );
}
