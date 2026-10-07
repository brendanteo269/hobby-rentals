import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import {
  AUDIT_PAGE_SIZE,
  getListingAuditTrail,
  recordListingViewed,
} from "@/lib/audit";
import { ROUTES } from "@/lib/routes";
import { formatDate, formatDateTime, formatMoney, shortId } from "@/lib/format";
import { listingPhotoUrl } from "@/lib/env";
import {
  getCategoryOptions,
  getListingById,
  listingConditionLabel,
  listingLocationLabel,
  listingStatusLabel,
  listingStatusTone,
} from "@/lib/listings";
import { getAdminPassport, SERIAL_STATUS } from "@/lib/passports";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Badge,
  Container,
  DescriptionList,
  EmptyState,
  Panel,
} from "@/components/ui";
import { ListingModerationPanel } from "@/components/listing-moderation-panel";
import { AuditTrail } from "@/components/audit-trail";

export const metadata = { title: "Listing — HobbyRentals Admin" };

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type AttributeDefinitionRow = {
  attribute_key: string;
  label: string;
  data_type: "text" | "number" | "select";
};

/**
 * S2-22: general listing detail - item details, owner, category attributes,
 * pricing, status, availability and Product Passport status. The full
 * passport ledger stays on its own page (S2-24); this links to it rather
 * than duplicating it.
 */
export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auditPage?: string }>;
}) {
  await requirePortalSession();
  const { id } = await params;
  const { auditPage: auditPageParam } = await searchParams;
  const auditPage = Math.max(1, Number(auditPageParam) || 1);

  const listing = await getListingById(id);
  // Covers both a malformed id and one that does not exist - the two are not
  // distinguished, so this page cannot be used to probe which ids are real.
  if (!listing) notFound();

  // The serial status below can be sensitive, so looking is itself recorded,
  // against the owner - same pattern as the passport page's own audit entry.
  await recordListingViewed(id, listing.owner_id);

  const [
    passport,
    { data: attributeDefs },
    categories,
    { entries: auditEntries, total: auditTotal },
  ] = await Promise.all([
    getAdminPassport(id).catch(() => null),
    createAdminClient()
      .from("category_attribute_definitions")
      .select("attribute_key,label,data_type")
      .eq("category_slug", listing.category)
      .order("display_order"),
    getCategoryOptions(),
    getListingAuditTrail(id, listing.owner_id, auditPage),
  ]);
  const auditLastPage = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));

  const categoryLabel =
    categories.find((c) => c.slug === listing.category)?.label ??
    listing.category;
  const serialStatus = passport
    ? (SERIAL_STATUS[passport.serial_status] ?? SERIAL_STATUS.PENDING)
    : null;

  const setAttributes = (
    (attributeDefs ?? []) as AttributeDefinitionRow[]
  ).filter(
    (def) =>
      listing.attributes[def.attribute_key] !== undefined &&
      listing.attributes[def.attribute_key] !== null,
  );

  const scheduleDays =
    listing.has_custom_availability && listing.custom_available_days
      ? listing.custom_available_days
          .slice()
          .sort((a, b) => a - b)
          .map((day) => WEEKDAY_LABELS[day - 1])
          .join(", ")
      : null;

  return (
    <Container className="py-12">
      <Link
        href={ROUTES.listings}
        className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        ← Listings
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Listing</p>
          <h1 className="display-caps mt-3 text-3xl">{listing.name}</h1>
          <p className="body-copy mt-2">{shortId(listing.id)}</p>
        </div>
        <Badge tone={listingStatusTone(listing.status)}>
          {listingStatusLabel(listing.status)}
        </Badge>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Photos">
            {listing.photo_keys.length === 0 ? (
              <div className="-mx-6 -my-5">
                <EmptyState
                  title="No photos"
                  body="This listing has no photos on record."
                />
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {listing.photo_keys.map((key) => (
                  <li key={key}>
                    <a
                      href={listingPhotoUrl(key)}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- public S3 URL built at request time */}
                      <img
                        src={listingPhotoUrl(key)}
                        alt=""
                        className="aspect-square w-full border border-line object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Item details">
            <DescriptionList
              items={[
                {
                  term: "Description",
                  value: (
                    <span className="block max-w-prose break-words whitespace-pre-line">
                      {listing.description}
                    </span>
                  ),
                },
                { term: "Category", value: <Badge>{categoryLabel}</Badge> },
                { term: "Brand", value: listing.brand },
                {
                  term: "Condition",
                  value: (
                    <Badge>{listingConditionLabel(listing.condition)}</Badge>
                  ),
                },
                {
                  term: "Location",
                  value: (
                    <Badge>{listingLocationLabel(listing.location_area)}</Badge>
                  ),
                },
                { term: "Created", value: formatDateTime(listing.created_at) },
                { term: "Last updated", value: formatDateTime(listing.updated_at) },
              ]}
            />
          </Panel>

          {setAttributes.length > 0 && (
            <Panel title="Category attributes">
              <DescriptionList
                items={setAttributes.map((def) => ({
                  term: def.label,
                  value: String(listing.attributes[def.attribute_key]),
                }))}
              />
            </Panel>
          )}

          <Panel title="Pricing">
            <DescriptionList
              items={[
                {
                  term: "Rate per day",
                  value: formatMoney(listing.price_per_day_cents),
                },
                {
                  term: "Rate per week",
                  value:
                    listing.price_per_week_cents !== null
                      ? formatMoney(listing.price_per_week_cents)
                      : "—",
                },
                {
                  term: "Security deposit",
                  value: formatMoney(listing.deposit_cents),
                },
                {
                  term: "Min rental days",
                  value: listing.min_rental_days ?? "—",
                },
                {
                  term: "Max rental days",
                  value: listing.max_rental_days ?? "—",
                },
              ]}
            />
          </Panel>

          <Panel title="Owner">
            <DescriptionList
              items={[
                {
                  term: "Account",
                  value: (
                    <Link
                      href={ROUTES.user(listing.owner_id)}
                      className="underline underline-offset-4"
                    >
                      {listing.owner_display_name ?? "No name"}
                    </Link>
                  ),
                },
                { term: "Email address", value: listing.owner_email ?? "—" },
                {
                  term: "Account ID",
                  value: <code className="text-xs">{listing.owner_id}</code>,
                },
              ]}
            />
          </Panel>

          <Panel title="Availability">
            <DescriptionList
              items={[
                {
                  term: "Available",
                  value: `${formatDate(listing.available_from)} – ${listing.available_until ? formatDate(listing.available_until) : "indefinitely"}`,
                },
                {
                  term: "Weekly schedule",
                  value: scheduleDays
                    ? `Custom (${scheduleDays})`
                    : "Owner's default schedule",
                },
                {
                  term: "Blackout dates",
                  value:
                    listing.upcomingBlackoutCount === 0
                      ? "None upcoming"
                      : `${listing.upcomingBlackoutCount} upcoming date range${listing.upcomingBlackoutCount === 1 ? "" : "s"}`,
                },
              ]}
            />
          </Panel>

          <Panel
            title="Product Passport"
            actions={
              <Link
                href={ROUTES.listingPassport(id)}
                className="text-sm underline underline-offset-4"
              >
                View full passport history →
              </Link>
            }
          >
            {passport && serialStatus ? (
              <DescriptionList
                items={[
                  {
                    term: "Serial status",
                    value: (
                      <Badge tone={serialStatus.tone}>
                        {serialStatus.label}
                      </Badge>
                    ),
                  },
                  {
                    term: "Missing",
                    value:
                      passport.missing.length === 0 ? (
                        "Nothing - complete"
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {passport.missing.map((item) => (
                            <Badge key={item} tone="warning">
                              {item}
                            </Badge>
                          ))}
                        </span>
                      ),
                  },
                ]}
              />
            ) : (
              <p className="body-copy">
                No Product Passport has been started for this listing yet.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <ListingModerationPanel
            key={listing.status}
            listingId={listing.id}
            status={listing.status}
            deactivationReason={listing.deactivation_reason}
          />
          <AuditTrail
            entries={auditEntries}
            page={auditPage}
            lastPage={auditLastPage}
            hrefForPage={(p) =>
              p > 1
                ? `${ROUTES.listing(id)}?auditPage=${p}`
                : ROUTES.listing(id)
            }
          />
        </div>
      </div>
    </Container>
  );
}
