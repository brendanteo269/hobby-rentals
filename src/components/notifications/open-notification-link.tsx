"use client";

import type { MouseEvent, ReactNode } from "react";
import { useTransition } from "react";
import { openFromSite } from "@/app/notifications/actions";
import { useToast } from "@/components/toast";
import { notificationPath } from "@/lib/routes";

/**
 * A notification's call to action on the site.
 *
 * A real link to /notifications/[id], so opening it in a new tab or copying it
 * behaves like the email link. A plain click instead runs openFromSite, which
 * refreshes the header's unread badge on the way to the event - see the
 * action for why the link alone cannot. Deliberately not a Next <Link>: no
 * prefetch, since opening a notification marks it read.
 */
export function OpenNotificationLink({
  id,
  className,
  onOpen,
  children,
}: {
  id: string;
  className?: string;
  /** Called as the open starts, e.g. to close the dropdown it sits in. */
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Leave modified clicks (new tab, new window, download) to the browser.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen?.();
    startTransition(async () => {
      // On success the action redirects, so it only returns on failure.
      const result = await openFromSite(id);
      if (result?.error) show(result.error, "error");
    });
  }

  return (
    <a href={notificationPath(id)} onClick={handleClick} aria-busy={pending} className={className}>
      {children}
    </a>
  );
}
