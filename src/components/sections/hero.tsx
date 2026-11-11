import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Container, Button, Input, Select } from "@/components/ui";
import { ShieldCheck, BadgeCheck, Handshake } from "lucide-react";
import { SearchExamples, SmartSearchNote } from "@/components/browse/search-examples";
import { browseHref, defaultSort, parseBrowseFilters, relatedCategoryHref } from "@/lib/browse-params";
import { CATEGORY_LABELS, LOCATION_AREAS, LOCATION_LABELS, isLocationArea, type ListingCategory } from "@/lib/listings";
import photographyPhoto from "../../../public/landing/photography.jpg";
import campingPhoto from "../../../public/landing/camping.jpg";
import musicPhoto from "../../../public/landing/music.jpg";

const TRUST_LINE = [
  { icon: ShieldCheck, label: "Escrow-protected" },
  { icon: BadgeCheck, label: "Product Passport" },
  { icon: Handshake, label: "Guided handover" },
];

/**
 * The showcase tiles. Bundled stock photos rather than live listings, so the
 * hero looks finished on an empty marketplace; each one is a category, not a
 * specific item, so none of them promises gear that may not be listed. The
 * first is the tall tile.
 */
const SHOWCASE: { category: ListingCategory; photo: StaticImageData; alt: string }[] = [
  { category: "PHOTOGRAPHY_VIDEOGRAPHY", photo: photographyPhoto, alt: "A film camera on the sand under a pier" },
  { category: "CAMPING_OUTDOOR", photo: campingPhoto, alt: "View from inside a tent onto a pine forest" },
  { category: "MUSIC_AUDIO", photo: musicPhoto, alt: "Guitars and a keyboard in a sunlit home studio" },
];

const fieldLabel = "block px-3 pb-1 text-[0.6875rem] font-medium text-ink-soft";

function exampleHref(q: string): string {
  return browseHref({ ...parseBrowseFilters({}), q, sort: defaultSort(q) });
}

function ShowcaseTile({ category, photo, alt, tall }: (typeof SHOWCASE)[number] & { tall: boolean }) {
  return (
    <Link
      href={relatedCategoryHref(category) as Route}
      className={`group relative overflow-hidden rounded-2xl bg-surface-muted outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 ${
        tall ? "col-span-3 row-span-2" : "col-span-2"
      }`}
    >
      <Image
        src={photo}
        alt={alt}
        fill
        placeholder="blur"
        // The tall tile is the largest thing above the fold.
        loading={tall ? "eager" : "lazy"}
        fetchPriority={tall ? "high" : "auto"}
        sizes={tall ? "(min-width: 1024px) 380px, 60vw" : "(min-width: 1024px) 250px, 40vw"}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <span className="absolute bottom-2 left-2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-medium text-ink shadow-sm sm:bottom-3 sm:left-3 sm:px-3 sm:py-1.5 sm:text-xs">
        {CATEGORY_LABELS[category]}{" "}
        <span aria-hidden="true" className="max-sm:hidden">
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Opening section: search card on the left, category photos on the right.
 *
 * The search card is a plain GET to /browse using the same filter param
 * names as the marketplace's own filter form (@/lib/browse-params), so
 * Browse picks the query straight up with no extra handoff code - and so an
 * anonymous visitor hits /browse's existing sign-in gate on submit.
 */
export function Hero({ defaultLocation }: { defaultLocation: string | null }) {
  // An owner's free-text legacy pickup location can't be selected in this
  // enum dropdown, so it prefills only when it is one of the real areas.
  const prefillLocation = defaultLocation && isLocationArea(defaultLocation) ? defaultLocation : "";

  return (
    <Container className="grid gap-10 pt-14 lg:grid-cols-2 lg:items-center lg:pt-20">
      <div>
        <p className="eyebrow">Peer-to-peer gear rentals · Singapore</p>
        <h1 className="heading mt-4 text-3xl leading-tight sm:text-4xl">
          Rent the gear you need. Make money on what you own.
        </h1>
        <p className="body-copy mt-4 max-w-md">
          Cameras, camping kit, instruments and tools from people near you, with your payment held
          until the item is back.
        </p>

        <form method="get" action="/browse" role="search" className="mt-8 card space-y-3 p-3">
          <label htmlFor="search" className="sr-only">
            Search for listings
          </label>
          <Input
            id="search"
            name="q"
            pill
            placeholder="Describe what you need, e.g. coffee like a barista"
            className="w-full border-transparent"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label htmlFor="location_area" className={fieldLabel}>
                Pickup area
              </label>
              <Select id="location_area" name="location_area" pill defaultValue={prefillLocation} className="border-transparent">
                <option value="">Anywhere</option>
                {LOCATION_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {LOCATION_LABELS[area]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="start_date" className={fieldLabel}>
                From
              </label>
              <Input id="start_date" name="start_date" type="date" pill className="border-transparent" />
            </div>
            <div>
              <label htmlFor="end_date" className={fieldLabel}>
                To
              </label>
              <Input id="end_date" name="end_date" type="date" pill className="border-transparent" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Search
          </Button>
          <div className="space-y-2 px-1 pt-1">
            <SmartSearchNote />
            <SearchExamples hrefFor={exampleHref} />
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {TRUST_LINE.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Icon className="size-4 text-ink" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid h-72 grid-cols-5 grid-rows-2 gap-3 sm:h-[26rem] lg:h-[34rem]">
        {SHOWCASE.map((tile, index) => (
          <ShowcaseTile key={tile.category} {...tile} tall={index === 0} />
        ))}
      </div>
    </Container>
  );
}
