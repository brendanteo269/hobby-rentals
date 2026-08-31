import { Container, Button, Input, ImageSlot } from "@/components/ui";

/** Opening section: full-bleed image with the search card laid over it. */
export function Hero() {
  return (
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
          <p className="body-copy mt-4">
            Earn from the gear you don&apos;t use. Singapore&apos;s trusted marketplace for
            high-value hobby equipment — cameras, kayaks, keyboards, kilns.
          </p>

          <form className="mt-6 flex gap-2">
            <label htmlFor="search" className="sr-only">
              Search for gear
            </label>
            <Input
              id="search"
              name="q"
              placeholder='Try "drone" or "espresso machine"'
              className="min-w-0 flex-1"
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
  );
}
