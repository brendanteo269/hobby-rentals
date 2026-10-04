import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { ROUTES } from "@/lib/routes";
import { formatDateTime, shortId } from "@/lib/format";
import { ENTRY_LABELS, getAdminPassport, PHOTO_LABELS, SERIAL_STATUS, type PassportEntry } from "@/lib/passports";
import { Badge, Container, DescriptionList, EmptyState, Panel } from "@/components/ui";

export const metadata = { title: "Product Passport — HobbyRentals Admin" };

/**
 * S2-24: a listing's Product Passport for review. Read-only on purpose - the
 * ledger is append-only in the database (a trigger rejects any update or
 * delete, secret key included), so there is nothing here that could edit it.
 */
export default async function ListingPassportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePortalSession();
  const { id } = await params;

  const passport = await getAdminPassport(id);
  if (!passport) notFound();

  // The serial is sensitive, so looking is itself recorded, against the owner.
  await recordAdminAction("passport_viewed", passport.listing.owner_id, { listing_id: id });

  const serialStatus = SERIAL_STATUS[passport.serial_status] ?? SERIAL_STATUS.PENDING;

  return (
    <Container className="py-12">
      <Link href={ROUTES.listings} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        ← Listings
      </Link>
      <p className="eyebrow mt-6">Product Passport</p>
      <h1 className="display-caps mt-3 text-3xl">{passport.listing.name}</h1>

      <div className="mt-8 space-y-8">
        <Panel title="Summary">
          <DescriptionList
            items={[
              { term: "Listing status", value: <Badge>{passport.listing.status}</Badge> },
              {
                term: "Owner",
                value: (
                  <Link href={ROUTES.user(passport.listing.owner_id)} className="underline underline-offset-4">
                    {shortId(passport.listing.owner_id)}
                  </Link>
                ),
              },
              {
                term: "Serial number",
                value: (
                  <span className="flex items-center gap-2">
                    <Badge tone={serialStatus.tone}>{serialStatus.label}</Badge>
                    {passport.serial_number && <span className="font-mono">{passport.serial_number}</span>}
                  </span>
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
                        <Badge key={item} tone="warning">{item}</Badge>
                      ))}
                    </span>
                  ),
              },
            ]}
          />
        </Panel>

        <Panel title="History" description="Newest first. Entries are permanent and cannot be edited or deleted.">
          {passport.entries.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState title="No entries yet" body="Nothing has been recorded against this passport." />
            </div>
          ) : (
            <ol className="space-y-8">
              {passport.entries.map((entry) => (
                <Entry key={entry.id} entry={entry} />
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </Container>
  );
}

function Entry({ entry }: { entry: PassportEntry }) {
  const data = entry.data;
  return (
    <li className="border-b border-line pb-8 last:border-0 last:pb-0">
      <p className="text-sm font-semibold">
        {data.method === "NO_SERIAL" ? "Distinguishing marks recorded" : ENTRY_LABELS[entry.entry_type] ?? entry.entry_type}
      </p>
      <p className="mt-0.5 text-xs text-ink-soft">
        <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time> · by{" "}
        <Link href={ROUTES.user(entry.created_by)} className="underline underline-offset-4">
          {shortId(entry.created_by)}
        </Link>
      </p>

      {typeof data.note === "string" && <p className="mt-2 text-sm whitespace-pre-line">{data.note}</p>}

      {typeof data.duplicate_of === "string" && (
        <p className="mt-2 text-xs text-ink-soft">
          <Badge tone="critical">Duplicate serial</Badge> Same brand and serial as{" "}
          <Link href={ROUTES.listingPassport(data.duplicate_of)} className="underline underline-offset-4">
            listing {shortId(data.duplicate_of)}
          </Link>
          , owned by another member.
        </p>
      )}

      {entry.entry_type === "SERIAL_VERIFICATION" && data.method !== "NO_SERIAL" && (
        <p className="mt-2 text-xs text-ink-soft">
          Read by AI as {data.extracted ? <span className="font-mono">{String(data.extracted)}</span> : "nothing"}
          {typeof data.confidence === "number" && ` (${Math.round(data.confidence * 100)}% confident)`}
          {data.manually_corrected === true && (
            <>
              {" "}· <Badge tone="warning">Corrected by owner</Badge>
            </>
          )}
        </p>
      )}

      {Object.keys(entry.photo_urls).length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(entry.photo_urls).map(([name, url]) => (
            <li key={name}>
              <a href={url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- S3 URL, possibly short-lived presigned */}
                <img src={url} alt={PHOTO_LABELS[name] ?? name} className="aspect-square w-full border border-line object-cover" />
              </a>
              <p className="mt-1 text-xs text-ink-soft">{PHOTO_LABELS[name] ?? name}</p>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
