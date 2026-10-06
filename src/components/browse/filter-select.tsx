import type { ReactNode } from "react";
import { Select } from "@/components/ui";

/**
 * One filter dropdown on a browse form.
 *
 * Left uncontrolled and blank on every render: the applied values are shown
 * as removable chips above the results, so repeating them as a selection here
 * would offer two ways to change one thing. Choosing again appends another
 * value rather than replacing the current one, which is how a member builds a
 * multi-value filter without any client JavaScript.
 */
export function FilterSelect({
  id,
  label,
  placeholder,
  children,
}: {
  id: string;
  label: string;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-44">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <Select id={id} name={id} defaultValue="" className="mt-2">
        <option value="">{placeholder}</option>
        {children}
      </Select>
    </div>
  );
}
