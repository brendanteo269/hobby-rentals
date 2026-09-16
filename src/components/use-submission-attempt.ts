"use client";

import { useState } from "react";

/**
 * Keeps a form's contents alive across a rejected server action.
 *
 * React 19 resets a form once its action returns. For anything the member
 * typed that means a validation failure clears the whole form — so one
 * mistyped character costs them every other field, and on a form where some
 * controls decide which others are shown, it costs them those too.
 *
 * Making the controls *controlled* is not enough on its own: React skips
 * writing a DOM value it believes has not changed, so the reset lands after
 * the render that would have restored it. The number returned here changes on
 * every result and is meant to be used as the `key` of the `<form>` element —
 * a freshly mounted form is not the node the reset holds a reference to, so
 * the restored values survive.
 *
 * `onResult` runs during render, which is where React wants state that derives
 * from a value that just changed. Use it to re-seed the field state from
 * whatever the action echoed back.
 *
 * ```tsx
 * const attempt = useSubmissionAttempt(state, (next) => {
 *   if (next?.values) setValues(next.values);
 * });
 * return <form key={attempt} action={formAction}>…</form>;
 * ```
 */
export function useSubmissionAttempt<S>(state: S, onResult: (state: S) => void): number {
  const [attempt, setAttempt] = useState(0);
  const [seen, setSeen] = useState(state);

  if (state !== seen) {
    setSeen(state);
    setAttempt((n) => n + 1);
    onResult(state);
  }

  return attempt;
}
