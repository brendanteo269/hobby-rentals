"use client";

import type { ReactNode } from "react";
import { PillSelect } from "./filter-bar";

/**
 * One filter dropdown in the marketplace's filter row, applied as soon as a
 * value is picked. The form's Search button applies it too, so the filter
 * still works without client JavaScript.
 *
 * Left uncontrolled and blank on every render: the applied values are shown
 * as removable chips above the results, so repeating them as a selection here
 * would offer two ways to change one thing. Choosing again appends another
 * value rather than replacing the current one, which is how a member builds a
 * multi-value filter.
 */
export function FilterSelect({
  id,
  label,
  placeholder,
  children,
}: {
  id: string;
  /** Read by screen readers; the placeholder is what shows. */
  label: string;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <PillSelect id={id} name={id} defaultValue="" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        <option value="">{placeholder}</option>
        {children}
      </PillSelect>
    </>
  );
}
