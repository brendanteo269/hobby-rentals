import type { Route } from "next";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { BackendApiError } from "@/lib/api/client";
import { openNotification } from "@/lib/api/notifications";
import type { OpenedNotification } from "@/lib/notifications";
import { formatDateTime } from "@/lib/format";
import { NOTIFICATIONS_PATH, safeNextPath } from "@/lib/routes";

export const metadata = { title: "Notification — HobbyRentals" };

/**
 * Where every notification's call to action lands - the bell, the list, and
 * the link in the email (Scenarios 2 and 3). A signed-out reader is sent
 * through the login screen by the proxy and returned here.
 *
 * While the action still applies, this forwards straight to the event. Once
 * its window has closed - the deadline passed, or the booking has moved on -
 * it says so and offers what can be done instead (Scenario 4).
 */
export default async function OpenNotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let opened: OpenedNotification;
  try {
    opened = await openNotification(id);
  } catch (error) {
    unstable_rethrow(error);
    // 404: not this member's notification. 422: not even an id. Either way
    // there is nothing here for them, and nothing to say about why.
    if (error instanceof BackendApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }

  if (!opened.expired) {
    // The backend builds these paths, but a redirect target is checked here
    // anyway rather than trusted: this is the one page that forwards blindly.
    redirect((safeNextPath(opened.target_path) ?? NOTIFICATIONS_PATH) as Route);
  }

  const remediation = opened.remediation && safeNextPath(opened.remediation.path);

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="eyebrow">Notification</p>
        <h1 className="heading mt-3 text-3xl">This window has closed</h1>
        <p className="body-copy mt-3">
          The action in this notification stopped applying on {formatDateTime(opened.closed_at)}, so
          there is nothing left to do from here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {remediation && opened.remediation && (
            <ButtonLink href={remediation as Route}>{opened.remediation.label}</ButtonLink>
          )}
          <ButtonLink href={NOTIFICATIONS_PATH} variant="outline">
            All notifications
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
