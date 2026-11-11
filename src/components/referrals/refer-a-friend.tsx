import { ShareButton } from "@/components/listings/share-button";
import { FormNotice } from "@/components/ui";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { creditEarnedCents, inviteText, maxCreditCents, welcomeRewardMessage, type ReferralSummary } from "@/lib/referrals";
import { referralPath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/share";

/**
 * S6-07: Profile > Refer a friend. The member's link and code, a way to share
 * them, and how their friends have done - as counts only, so no friend's
 * rentals are shown to the person who invited them.
 */
export function ReferAFriend({ summary }: { summary: ReferralSummary }) {
  const link = absoluteUrl(referralPath(summary.code), siteUrl());
  const reward = formatMoney(summary.reward_cents);
  const atCap = summary.credited_count >= summary.max_rewarded_referrals;
  const welcome = welcomeRewardMessage(summary);

  return (
    <div className="space-y-8">
      {/* The member's own referral, if they joined through a link: the lasting
          record of the notice their signup sent. */}
      {welcome &&
        (summary.referred_status === "INELIGIBLE" ? (
          <p className="body-copy text-sm">{welcome}</p>
        ) : (
          <FormNotice message={welcome} tone="success" />
        ))}

      <div>
        <p className="eyebrow">Refer a friend</p>
        <h2 className="heading mt-2 text-2xl">Give {reward}, get {reward}</h2>
        <p className="body-copy mt-2 max-w-xl">
          Invite friends with your link. When one completes their first rental, you both get {reward} wallet credit.
        </p>
      </div>

      <section className="card space-y-5 p-6 sm:p-8" aria-label="Your referral link">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="eyebrow">Your link</p>
            <p className="mt-2 break-all text-sm font-medium">{link}</p>
          </div>
          <div>
            <p className="eyebrow">Your code</p>
            <p className="mt-2 font-mono text-lg tracking-widest">{summary.code}</p>
          </div>
        </div>
        <ShareButton url={link} text={inviteText(summary.reward_cents)} what="invite" />
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="How your invites are doing">
        <Stat label="Friends joined" value={String(summary.joined_count)} />
        <Stat label="Completed a rental" value={String(summary.completed_count)} />
        <Stat
          label="Credit earned"
          value={`${formatMoney(creditEarnedCents(summary))} of ${formatMoney(maxCreditCents(summary))}`}
        />
      </section>

      {atCap && (
        <p className="body-copy text-sm">
          You&apos;ve earned the most referral credit there is. Friends who join with your link still get their {reward}.
        </p>
      )}

      <section aria-labelledby="referral-how-it-works">
        <h3 id="referral-how-it-works" className="heading text-lg">
          How it works
        </h3>
        <ul className="body-copy mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>Your friend signs up with your link or code.</li>
          <li>
            Once their first rental is returned and settled, you each get {reward} wallet credit, for up to{" "}
            {summary.max_rewarded_referrals} friends.
          </li>
          <li>Credit pays for your next rental fee. It doesn&apos;t cover deposits and can&apos;t be withdrawn.</li>
          <li>Accounts that share a mobile number or payment card don&apos;t earn credit.</li>
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
    </div>
  );
}
