import { Container, Button, Input, Select, ImageSlot } from "@/components/ui";
import { ShieldCheck, BadgeCheck, Handshake, Camera } from "lucide-react";
import { HERO_IMAGE } from "@/lib/mock-images";
import { LOCATION_AREAS, LOCATION_LABELS, isLocationArea } from "@/lib/listings";

const TRUST_LINE = [
  { icon: ShieldCheck, label: "Escrow-protected" },
  { icon: BadgeCheck, label: "Product Passport" },
  { icon: Handshake, label: "Guided handover" },
];

/**
 * Opening section: search card on the left, a showcase image on the right.
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
          A secure, community-backed rental platform for photography, outdoor gear, and creator
          kits across Singapore.
        </p>

        <form method="get" action="/browse" role="search" className="mt-8 card space-y-2 p-3">
          <label htmlFor="search" className="sr-only">
            Search for listings
          </label>
          <Input
            id="search"
            name="q"
            pill
            placeholder="Search listings"
            className="w-full border-transparent"
          />
          <div className="flex flex-wrap gap-2">
            <label htmlFor="location_area" className="sr-only">
              Pickup location
            </label>
            <Select
              id="location_area"
              name="location_area"
              pill
              defaultValue={prefillLocation}
              className="min-w-36 flex-1 border-transparent"
            >
              <option value="">Pickup location</option>
              {LOCATION_AREAS.map((area) => (
                <option key={area} value={area}>
                  {LOCATION_LABELS[area]}
                </option>
              ))}
            </Select>
            <label htmlFor="start_date" className="sr-only">
              Start date
            </label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              pill
              className="min-w-32 flex-1 border-transparent"
            />
            <label htmlFor="end_date" className="sr-only">
              End date
            </label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              pill
              className="min-w-32 flex-1 border-transparent"
            />
          </div>
          <Button type="submit" className="w-full">
            Search
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {TRUST_LINE.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Icon className="size-4 text-ink" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <ImageSlot
          label="Hobby gear laid out on a wooden table"
          src={HERO_IMAGE}
          align="end"
          className="aspect-4/5 w-full rounded-3xl lg:aspect-square"
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-sm sm:right-auto">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink">
            <Camera className="size-4" aria-hidden="true" />
          </span>
          <p className="text-xs font-medium">Sony Cinema Kit · Tampines · 5.0</p>
        </div>
      </div>
    </Container>
  );
}
