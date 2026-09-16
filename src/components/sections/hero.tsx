import { Container, Button, Input, ImageSlot } from "@/components/ui";
import { ShieldCheck, BadgeCheck, Handshake, Camera } from "lucide-react";
import { HERO_IMAGE } from "@/lib/mock-images";

const TRUST_LINE = [
  { icon: ShieldCheck, label: "Escrow-protected" },
  { icon: BadgeCheck, label: "Verified Passports" },
  { icon: Handshake, label: "Guided handover" },
];

/** Opening section: search card on the left, a showcase image on the right. */
export function Hero() {
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

        <form className="mt-8 card p-3 sm:flex sm:items-stretch sm:gap-2 sm:p-2">
          <label htmlFor="search" className="sr-only">
            Search for listings
          </label>
          <Input
            id="search"
            name="q"
            pill
            placeholder="Search listings"
            className="border-transparent sm:flex-1"
          />
          <label htmlFor="area" className="sr-only">
            Pickup location
          </label>
          <Input
            id="area"
            name="area"
            pill
            placeholder="Pickup location"
            className="mt-2 border-transparent sm:mt-0 sm:flex-1"
          />
          <label htmlFor="dates" className="sr-only">
            Rental dates
          </label>
          <Input
            id="dates"
            name="dates"
            pill
            placeholder="Add your dates"
            className="mt-2 border-transparent sm:mt-0 sm:flex-1"
          />
          <Button type="submit" className="mt-2 w-full sm:mt-0 sm:w-auto">
            Search
          </Button>
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
