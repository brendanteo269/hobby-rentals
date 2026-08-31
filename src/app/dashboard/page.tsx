import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui";

export const metadata = { title: "Dashboard — HobbyRentals" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy guard already redirects anonymous visitors; this is defence in
  // depth and narrows the type for the render below.
  if (!user) redirect("/login");

  return (
    <Container className="py-20">
      <p className="eyebrow">Signed in</p>
      <h1 className="display-caps mt-3 text-3xl">Your account</h1>
      <p className="mt-4 text-sm text-ink-soft">
        Listings and bookings will live here. For now this page exists to prove the email
        verification flow end to end.
      </p>

      <dl className="mt-10 max-w-md divide-y divide-line border-t border-line text-sm">
        <div className="flex justify-between gap-6 py-3">
          <dt className="text-ink-soft">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between gap-6 py-3">
          <dt className="text-ink-soft">Email confirmed</dt>
          <dd>{user.email_confirmed_at ? "Yes" : "No"}</dd>
        </div>
        <div className="flex justify-between gap-6 py-3">
          <dt className="text-ink-soft">User ID</dt>
          <dd className="truncate font-mono text-xs">{user.id}</dd>
        </div>
      </dl>
    </Container>
  );
}
