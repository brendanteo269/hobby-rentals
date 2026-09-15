import { Container, ButtonLink } from "@/components/ui";

/** Two-card pitch: owners monetise idle gear, renters skip ownership. */
export function OwnerRenterSplit() {
  return (
    <Container className="pt-20">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-dark p-8 text-white sm:p-10">
          <p className="eyebrow text-white/60">For owners</p>
          <h2 className="heading mt-3 text-2xl">Monetise your idle gear</h2>
          <p className="mt-3 text-sm text-white/70">
            Let your gear fund its next upgrade with auto-pricing and trusted handovers.
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
            {/* Illustrative only — not wired to real earnings data, so this is
                a plain native select rather than the shared `Select`, whose
                base classes are styled for light surfaces. */}
            <select
              defaultValue="Camera"
              className="w-auto rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-sm text-white outline-none"
            >
              <option className="text-ink">Camera</option>
              <option className="text-ink">Tent</option>
              <option className="text-ink">Kayak</option>
            </select>
            <p className="text-sm text-white/80">Earn up to $320/month</p>
          </div>

          <ButtonLink href="/listings/new" className="mt-6">
            List gear with auto-pricing →
          </ButtonLink>
        </div>

        <div className="rounded-2xl border border-line bg-white p-8 sm:p-10">
          <p className="eyebrow">For renters</p>
          <h2 className="heading mt-3 text-2xl">Adventure without ownership</h2>
          <p className="body-copy mt-3">
            Build a complete weekend camping bundle for two, from tent to stove, at a fraction of
            buying new.
          </p>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-line p-3">
            <p className="text-sm font-medium">Tent · Stove · Sleeping kits</p>
            <div className="text-right">
              <p className="text-xs text-ink-soft">Weekend camping bundle</p>
              <p className="text-sm font-semibold">From $86 / weekend</p>
            </div>
          </div>

          <ButtonLink href="/browse" variant="outline" className="mt-6">
            Explore curated bundles →
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
