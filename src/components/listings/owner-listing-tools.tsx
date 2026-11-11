import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { BookOpen, ClipboardList, Megaphone, ShieldCheck, Tag } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import type { Listing } from "@/lib/listings";
import { listingGuidePath } from "@/lib/routes";

type Tool = { icon: LucideIcon; title: string; status: string; href: Route; action: string };

/**
 * The owner's tools for one listing, in the slot a renter sees the booking
 * form in. Grouped by who they serve - what renters get with the item, then
 * what the owner earns and how many see it - each row saying where it stands
 * so the owner can tell what still needs doing without opening every page.
 */
export function OwnerListingTools({ listing }: { listing: Listing }) {
  const live = listing.status === "ACTIVE";
  const groups: { title: string; tools: Tool[] }[] = [
    {
      title: "For your renters",
      tools: [
        {
          icon: BookOpen,
          title: "Quick-start guide",
          status: listing.has_guide ? "Added - renters see it once you confirm their booking" : "Not added - show renters how to set it up",
          href: listingGuidePath(listing.id) as Route,
          action: listing.has_guide ? "Edit" : "Add",
        },
        {
          icon: ClipboardList,
          title: "Product Passport",
          status: "The condition record renters check before booking",
          href: `/listings/${listing.id}/passport` as Route,
          action: "View",
        },
      ],
    },
    {
      title: "Earnings & visibility",
      tools: [
        {
          icon: ShieldCheck,
          title: "HobbyShield",
          status: listing.replacement_value_cents == null ? "Set a replacement value to offer damage protection" : "Damage protection for this item",
          href: (listing.replacement_value_cents == null ? `/listings/${listing.id}/edit#price` : `/listings/${listing.id}/protection`) as Route,
          action: listing.replacement_value_cents == null ? "Set up" : "Manage",
        },
        ...(live
          ? [
              {
                icon: Tag,
                title: "Pricing",
                status: "Get a fresh market recommendation",
                href: `/listings/${listing.id}/edit#price` as Route,
                action: "Review",
              },
              {
                icon: Megaphone,
                title: "Promotion",
                status: listing.is_promoted ? "Promoted - shown higher in search" : "Not promoted",
                href: `/listings/${listing.id}/promotion` as Route,
                action: listing.is_promoted ? "View" : "Promote",
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <section className="mt-6 border-t border-line pt-6">
      <h2 className="heading text-lg">Manage this listing</h2>
      {groups.map((group) => (
        <div key={group.title} className="mt-4">
          <p className="eyebrow">{group.title}</p>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {group.tools.map((tool) => (
              <li key={tool.title} className="flex items-center gap-3 p-3">
                <tool.icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tool.title}</p>
                  <p className="text-xs text-ink-soft">{tool.status}</p>
                </div>
                <ButtonLink href={tool.href} variant="outline" className="shrink-0 px-4 py-1.5 text-xs" aria-label={`${tool.action} ${tool.title.toLowerCase()}`}>
                  {tool.action}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
