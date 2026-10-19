import { Button } from "@/components/ui";

/**
 * S3-06 Scenario 3: the renter's two answers to a claim, offered within the
 * response window. What they do - settle the claim from the deposit (S3-07) or
 * open a rebuttal for an admin to decide (S3-08) - belongs to those stories,
 * so the options are shown but not yet live.
 */
export function ClaimResponseOptions() {
  return (
    <section aria-labelledby="claim-response-heading" className="space-y-3 border border-line px-4 py-4">
      <h2 id="claim-response-heading" className="heading text-xl">
        Your response
      </h2>
      <p className="body-copy">
        Accept the claim to have it settled from your deposit, or dispute it to have the platform decide.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled title="Accepting a claim is coming soon">
          Accept claim
        </Button>
        <Button variant="outline" disabled title="Disputing a claim is coming soon">
          Dispute claim
        </Button>
      </div>
      <p className="text-xs text-ink-soft">Responding to a claim is coming soon.</p>
    </section>
  );
}
