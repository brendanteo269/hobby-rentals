"use client";

import { useActionState, useEffect } from "react";
import { Button, FormError, Select } from "./ui";
import { useToast } from "./toast";
import { saveLanguagePreferences, type FormState } from "@/app/profile/actions";
import { LANGUAGES, type LanguagePreferences } from "@/lib/translation";

/**
 * S6-04: the language a member prefers to read chat in, and whether messages
 * in other languages are translated for them without asking. Translations are
 * made by AI and always sit under the original message, never in place of it.
 */
export function LanguagePreferencesForm({ preferences }: { preferences: LanguagePreferences }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveLanguagePreferences, undefined);
  const { show } = useToast();
  useEffect(() => {
    if (state?.success) show(state.success, "success");
    // Only re-fires when useActionState hands back a new result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <section>
      <h2 className="heading text-xl">Language</h2>
      <p className="body-copy mt-2">
        Choose the language you read in. Messages in other languages can then be translated for you in chat, under the
        original.
      </p>

      <form action={formAction} className="mt-6 max-w-xl space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Preferred language</span>
          <Select
            name="preferred_language"
            className="mt-2 w-full"
            defaultValue={preferences.preferred_language ?? ""}
            disabled={pending}
          >
            <option value="">Not set</option>
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line p-4">
          <span>
            <span className="block text-sm font-medium">Always translate</span>
            <span className="body-copy mt-1 block">
              Translate incoming messages in other languages automatically. Needs a preferred language.
            </span>
          </span>
          <input
            type="checkbox"
            name="always_translate"
            className="mt-1 size-4 shrink-0 accent-ink"
            defaultChecked={preferences.always_translate}
            disabled={pending}
            aria-label="Always translate incoming messages"
          />
        </label>

        <FormError message={state?.error} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save language"}
        </Button>
      </form>
    </section>
  );
}
