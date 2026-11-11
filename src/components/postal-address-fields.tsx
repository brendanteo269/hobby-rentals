"use client";

import { Input } from "@/components/ui";
import type { PostalAddress } from "@/components/use-postal-address";

/**
 * The postal code and address inputs, with what the lookup said about the code.
 * Used wherever someone gives a Singapore address: the meetup proposal's custom
 * address and a delivery address.
 */
export function PostalAddressFields({
  lookup,
  addressPlaceholder = "e.g. 123 Example St",
}: {
  lookup: PostalAddress;
  addressPlaceholder?: string;
}) {
  const { postal, setPostal, address, setAddress, status } = lookup;
  return (
    <div className="max-w-sm space-y-2">
      <div>
        <Input
          value={postal}
          onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="Postal code, e.g. 118956"
          aria-label="Postal code"
        />
        {status === "loading" && <p className="mt-1 text-xs text-ink-soft">Looking up address…</p>}
        {status === "found" && <p className="mt-1 text-xs text-ink-soft">Address filled in below — edit it if needed.</p>}
        {status === "not-found" && <p className="mt-1 text-xs text-ink-soft">No address found for that postal code.</p>}
        {status === "error" && (
          <p className="mt-1 text-xs text-ink-soft">Couldn&apos;t look that up — type the address below.</p>
        )}
      </div>
      <Input
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder={addressPlaceholder}
        aria-label="Address"
      />
    </div>
  );
}
