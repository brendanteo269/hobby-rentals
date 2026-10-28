"use client";

import { useActionState, useEffect } from "react";
import { MailCheck } from "lucide-react";
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
            const alwaysEmailed = preference?.always_emailed ?? [];
            return (
              <li key={category}>
                <label className="flex cursor-pointer items-start justify-between gap-4 p-4">
                  <span>
                    <span className="block text-sm font-medium">{CATEGORY_COPY[category].label}</span>
                    <span className="body-copy mt-1 block">{CATEGORY_COPY[category].description}</span>
                    {/* Scenario 3: said beside the switch, so nobody turns it
                        off expecting silence. */}
                    {alwaysEmailed.length > 0 && (
                      <span className="mt-2 flex gap-1.5 text-xs text-ink-soft">
                        <MailCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                        <span>Always emailed: {alwaysEmailed.join(", ").toLowerCase()}.</span>
                      </span>
                    )}
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

        <FormError message={state?.error} />
        <Button type="submit" className="mt-6" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </section>
  );
}
