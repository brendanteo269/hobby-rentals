import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { ROUTES } from "@/lib/routes";
import { getUserAuditTrail } from "@/lib/audit";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  accountStatus,
  getUserById,
  isEmailVerified,
  roleLabels,
  userLabel,
} from "@/lib/users";
import { Badge, Container, DescriptionList, Panel } from "@/components/ui";
import { VerificationPanel } from "@/components/verification-panel";
import { AuditTrail } from "@/components/audit-trail";

export const metadata = { title: "Account — HobbyRentals Admin" };

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePortalSession();
  const { id } = await params;

  const user = await getUserById(id);
  // Covers both a malformed id and one that does not exist. The two are not
  // distinguished, so this page cannot be used to probe which ids are real.
  if (!user) notFound();

  const status = accountStatus(user);
  const verified = isEmailVerified(user);
  const auditEntries = await getUserAuditTrail(user.id);

  return (
    <Container className="py-12">
      <Link
        href={ROUTES.users}
        className="text-sm text-ink-soft transition-colors hover:text-ink"
      >
        ← All accounts
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="display-caps mt-3 text-3xl">{userLabel(user)}</h1>
          <p className="body-copy mt-2">{user.email ?? "No email address"}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <p className="body-copy mt-4 max-w-prose">{status.detail}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Account details">
            <DescriptionList
              items={[
                { term: "Account ID", value: <code className="text-xs">{user.id}</code> },
                { term: "Email address", value: user.email ?? "—" },
                {
                  term: "Email verification",
                  value: (
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={verified ? "positive" : "warning"}>
                        {verified ? "Verified" : "Unverified"}
                      </Badge>
                      {verified && (
                        <span className="text-ink-soft">
                          on {formatDate(user.email_confirmed_at)}
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  term: "Roles",
                  value: (
                    <span className="flex flex-wrap gap-1.5">
                      {roleLabels(user).map((role) => (
                        <Badge key={role.label} tone={role.tone}>
                          {role.label}
                        </Badge>
                      ))}
                    </span>
                  ),
                },
                { term: "Registered", value: formatDateTime(user.created_at) },
                { term: "Last sign in", value: formatDateTime(user.last_sign_in_at, "Never") },
                {
                  term: "Setup completed",
                  value: formatDateTime(user.onboarded_at, "Not finished"),
                },
                {
                  term: "Suspended until",
                  value: formatDateTime(user.banned_until, "Not suspended"),
                },
              ]}
            />
          </Panel>

          <VerificationPanel userId={user.id} email={user.email} verified={verified} />
        </div>

        <AuditTrail entries={auditEntries} />
      </div>
    </Container>
  );
}
