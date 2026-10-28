"use client";

import { useActionState, useEffect } from "react";
import { Info } from "lucide-react";
import { Button, FormError } from "./ui";
import { useToast } from "./toast";
import { saveNotificationPreferences, type FormState } from "@/app/profile/actions";
import {
  CATEGORY_COPY,
  NOTIFICATION_CATEGORIES,
  preferenceFieldName,
  type NotificationPreference,
} from "@/lib/notification-preferences";

/**
 * S4-XX: an email on/off box per notification category. Every notification
 * still appears on the site whatever is chosen here; only its email stops.
 */
export function NotificationPreferences({ preferences }: { preferences: NotificationPreference[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveNotificationPreferences, undefined);
  const { show } = useToast();
  useEffect(() => {
    if (state?.success) show(state.success, "success");
    // Only re-fires when useActionState hands back a new result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const byCategory = new Map(preferences.map((preference) => [preference.category, preference]));

  return (
    <section>
      <h2 className="heading text-xl">Email notifications</h2>
      <p className="body-copy mt-2">
        Choose what we also email you about. Everything still shows in your notifications here.
      </p>

      <form action={formAction} className="mt-6 max-w-xl">
        <ul className="divide-y divide-line rounded-lg border border-line">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const preference = byCategory.get(category);
            return (
              <li key={category}>
                <label className="flex cursor-pointer items-start justify-between gap-4 p-4">
                  <span>
                    <span className="block text-sm font-medium">{CATEGORY_COPY[category].label}</span>
                    <span className="body-copy mt-1 block">{CATEGORY_COPY[category].description}</span>
                  </span>
                  <input
                    type="checkbox"
                    name={preferenceFieldName(category)}
                    className="mt-1 size-4 shrink-0 accent-ink"
                    defaultChecked={preference?.email_enabled ?? true}
                    disabled={pending}
                    aria-label={`Email me about ${CATEGORY_COPY[category].label.toLowerCase()}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>

        {/* Turning a category off silences all of its emails. Anything a
            member must hear about regardless, our team emails them itself. */}
        <p className="mt-4 flex gap-2 text-sm text-ink-soft">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Turning a category off stops all of its emails. If something important needs your attention, such as a
            damage claim, a payment or your account&apos;s standing, our team will email you about it directly.
          </span>
        </p>

        <FormError message={state?.error} />
        <Button type="submit" className="mt-6" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </section>
  );
}
