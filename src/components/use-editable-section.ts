"use client";

import { useState } from "react";
import { useSubmissionAttempt } from "./use-submission-attempt";

type Result = { success?: string } | undefined | null;

/**
 * A profile section that is read-only until the member chooses to edit it.
 *
 * Every section on the Account tab does the same dance — show the saved values
 * disabled, swap to editable on Edit, save or abandon — so it lives here once
 * rather than being copied into each. The markup stays with each section,
 * because they ask for different things and a component with enough props to
 * cover all of them would hide more than it shared.
 *
 * Two behaviours are the point of S1-03:
 *
 *  - **Cancel reverts** to what was last *saved*, which is why `saved` is read
 *    on every render rather than captured once. Reverting to the values the
 *    page happened to load with would undo an earlier successful save.
 *  - **A rejected save keeps what was typed.** React 19 resets a form once its
 *    action returns, so `attempt` is applied as the `<form>` key; see
 *    useSubmissionAttempt for why holding the values in state is not enough on
 *    its own.
 */
export function useEditableSection<V extends object>(saved: V, state: Result) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<V>(saved);

  const attempt = useSubmissionAttempt(state, (next) => {
    // A successful save makes the edited values the saved ones, so there is
    // nothing to restore — just close the section.
    if (next?.success) setEditing(false);
  });

  return {
    editing,
    values,
    attempt,
    setValue<K extends keyof V>(key: K, value: V[K]) {
      setValues((current) => ({ ...current, [key]: value }));
    },
    edit() {
      // Start from what is saved now, not from an abandoned earlier edit.
      setValues(saved);
      setEditing(true);
    },
    cancel() {
      setValues(saved);
      setEditing(false);
    },
  };
}
