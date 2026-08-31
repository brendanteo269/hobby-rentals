import Link from "next/link";
import { Container, SectionHead, Button, ButtonLink, ImageSlot } from "@/components/ui";

const CATEGORIES = [
  { name: "Cameras & drones", listings: "431 listings" },
  { name: "Camping & hiking", listings: "687 listings" },
  { name: "Water sports", listings: "312 listings" },
  { name: "Music & audio", listings: "526 listings" },
];

const STEPS = [
  {
    n: "01",
    title: "Find it nearby",
    body: "Filter by hobby, dates and MRT stop. Every listing shows the owner's real response time.",
  },
  {
    n: "02",
    title: "Book the dates",
    body: "Request the days you need and pay in the app. Nothing leaves your account until the owner accepts.",
  },
  {
    n: "03",
    title: "Collect and go",
    body: "Meet the owner, check the kit together in the app, and the rental is covered from that moment.",
  },
];

const LISTINGS = [
  {
    title: "DJI Osmo Pocket 4 Creator Combo",
    price: "$49.00 / 2 days",
    body: "Wide lens, two batteries and the wireless mic in the case.",
    meta: "Bukit Timah · replies in 2h",
    tag: "Cameras",
    slot: "Pocket gimbal on a mini tripod",
  },
  {
    title: "Fujifilm X-T5 with 35mm f/1.4",
    price: "$58.00 / 2 days",
    body: "Godox speedlight and three cards included. 41 rentals, no claims.",
    meta: "Tiong Bahru · replies in 40m",
    tag: "Cameras",
    slot: "Mirrorless body with flash",
  },
  {
    title: "Perception Sound 10.5 Kayak",
    price: "$45.00 / day",
    body: "Paddle, dry bag and roof straps. Collect two minutes from the water.",
    meta: "East Coast Park · replies in 3h",
    tag: "Water sports",
    slot: "Sea kayak on the sand",
  },
  {
    title: "Nord Stage 4 Compact 73",
    price: "$72.00 / 2 days",
    body: "Gig bag, sustain pedal and stand. Two-man lift, so bring a friend.",
    meta: "Serangoon · replies in 1h",
    tag: "Music & audio",
    slot: "Stage keyboard in a home studio",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <ImageSlot
          label="Hobby gear laid out on a wooden table"
          align="end"
          className="h-[420px] w-full"
        />
        <Container className="pointer-events-none absolute inset-0 flex items-center">
          <div className="pointer-events-auto max-w-md bg-cream p-8 sm:p-10">
            <p className="eyebrow">Singapore · Peer to peer</p>
            <h1 className="display-caps mt-4 text-3xl leading-tight sm:text-4xl">
              Rent the gear you want
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Earn from the gear you don&apos;t use. Singapore&apos;s trusted marketplace for
              high-value hobby equipment — cameras, kayaks, keyboards, kilns.
            </p>

            <form className="mt-6 flex gap-2">
              <label htmlFor="search" className="sr-only">
                Search for gear
              </label>
              <input
                id="search"
                name="q"
                placeholder='Try "drone" or "espresso machine"'
                className="min-w-0 flex-1 border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
              />
              <Button type="submit">Search</Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-1 text-xs text-ink-soft">
              <span>4,200 listings island-wide</span>
              <span>Damage cover on every rental</span>
            </div>
          </div>
        </Container>
      </section>

      {/* Browse by hobby */}
      <Container className="pt-20">
        <SectionHead title="Browse by hobby" href="/" linkLabel="All 24 categories" />
        <ul className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <li key={cat.name}>
              <Link href="/" className="group block">
                <ImageSlot label={cat.name} className="aspect-4/3 w-full" />
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide group-hover:text-clay">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-ink-soft">{cat.listings}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* Three steps */}
      <Container className="pt-20">
        <div className="bg-sand px-8 py-14 sm:px-14">
          <h2 className="display-caps text-center text-2xl sm:text-3xl">Three steps to the kit</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n}>
                <p className="font-display text-2xl text-clay">{step.n}</p>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>

      {/* Gear near you */}
      <Container className="pt-20">
        <SectionHead title="Gear near you" href="/" linkLabel="See everything" />
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LISTINGS.map((item) => (
            <li key={item.title} className="flex flex-col">
              <ImageSlot label={item.slot} className="aspect-square w-full" />
              <h3 className="mt-4 text-sm font-semibold uppercase leading-snug tracking-wide">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-medium">{item.price}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              <p className="mt-2 text-xs text-ink-soft">{item.meta}</p>
              <p className="mt-4">
                <span className="inline-block rounded-full bg-blush px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide">
                  {item.tag}
                </span>
              </p>
              <ButtonLink href="/signup" className="mt-4 w-full">
                Rent now
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Container>

      {/* Earn from your gear */}
      <Container className="pt-20">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col items-center justify-center bg-sand px-8 py-16 text-center">
            <h2 className="display-caps text-2xl sm:text-3xl">Earn from the gear you don&apos;t use</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
              The average camera body sits idle 340 days a year. List it in four minutes, set your
              own dates, and keep 85% of every booking.
            </p>
            <ButtonLink href="/signup" variant="outline" className="mt-6 bg-cream">
              List your gear
            </ButtonLink>
          </div>
          <ImageSlot label="Potter shaping clay on a wheel" className="min-h-[320px]" />
        </div>

        <div className="grid md:grid-cols-2">
          <ImageSlot label="An owner handing over a case of gear" className="min-h-[320px]" />
          <div className="flex flex-col items-center justify-center bg-sand px-8 py-16 text-center">
            <h2 className="display-caps text-2xl sm:text-3xl">Covered on both sides</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
              Singpass identity checks on every account, a photographed handover in the app, and
              damage cover to $5,000 on each rental. Payouts land two days after return.
            </p>
            <ButtonLink href="/" variant="outline" className="mt-6 bg-cream">
              How cover works
            </ButtonLink>
          </div>
        </div>
      </Container>

      {/* Newsletter — email capture only, not account signup */}
      <Container className="pt-20 text-center">
        <p className="text-xs text-ink-soft">Sign up for emails</p>
        <h2 className="display-caps mx-auto mt-3 max-w-lg text-2xl sm:text-3xl">
          New gear, new hobbies, every week
        </h2>
        <form className="mx-auto mt-8 max-w-sm">
          <label htmlFor="newsletter" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter"
            name="email"
            type="email"
            placeholder="Enter your email address"
            className="w-full border border-line bg-white px-3 py-2.5 text-center text-sm outline-none focus:border-ink"
          />
          <Button type="submit" className="mt-4">
            Sign up
          </Button>
        </form>
      </Container>
    </>
  );
}
