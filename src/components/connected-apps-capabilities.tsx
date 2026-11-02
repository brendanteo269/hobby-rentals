import { CalendarCheck, ClipboardList, Search, type LucideIcon } from "lucide-react";
import { Badge } from "./ui";

type Capability = {
  icon: LucideIcon;
  title: string;
  access: "No token needed" | "Token needed";
  items: string[];
  example: string;
};

/** One group per stage of renting. Each item is a tool /mcp offers, so a new tool belongs here too. */
const CAPABILITIES: Capability[] = [
  {
    icon: Search,
    title: "Discover gear",
    access: "No token needed",
    items: [
      "Search listings by describing what you need",
      "Filter by category, area, daily price and dates",
      "Find bundles of items rented together",
      "View a listing's public details",
    ],
    example: "Find me a tent for a rainy camping weekend",
  },
  {
    icon: CalendarCheck,
    title: "Plan and price",
    access: "No token needed",
    items: [
      "Check whether a listing or bundle is free on your dates",
      "See the next free dates if it is not",
      "Get the full price: rental, platform fee, deposit and total",
      "Compare a bundle's price with renting its items separately",
    ],
    example: "Is that tent free from 20 to 22 November, and what is the exact price?",
  },
  {
    icon: ClipboardList,
    title: "Book and keep track",
    access: "Token needed",
    items: [
      "Send a booking request for a listing, after confirming its summary",
      "See your latest bookings and where each one stands",
    ],
    example: "Request that tent for those dates",
  },
];

/**
 * S5-05: what connecting an assistant gets a member, and where it stops. The
 * limits sit beside the features because a token can place a wallet hold.
 */
export function ConnectedAppsCapabilities() {
  return (
    <details className="mt-8 max-w-2xl rounded-lg border border-line p-4">
      <summary className="cursor-pointer text-sm font-medium">What you can do with Claude</summary>
      <div className="mt-4">
        <ul className="space-y-4">
          {CAPABILITIES.map(({ icon: Icon, title, access, items, example }) => (
            <li key={title} className="rounded-lg bg-surface-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4" aria-hidden="true" />
                  {title}
                </h4>
                <Badge variant={access === "Token needed" ? "warning" : "success"}>{access}</Badge>
              </div>
              <ul className="body-copy mt-3 list-disc space-y-1 pl-5 text-sm">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 w-fit max-w-full rounded-2xl bg-white px-3 py-2 text-xs text-ink shadow-sm">
                <span className="sr-only">Example: </span>
                {example}
              </p>
            </li>
          ))}
        </ul>
        <p className="body-copy mt-4 text-sm">
          Owners still approve every request, including on listings that offer Instant Book. Claude cannot pay, cancel, make
          claims, send messages or request bundles. Use this site for those.
        </p>
      </div>
    </details>
  );
}
