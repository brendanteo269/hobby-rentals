"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown, Link2, Send, Share2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { useDismiss } from "@/components/use-dismiss";
import { telegramShareUrl, whatsappShareUrl } from "@/lib/share";

/**
 * S5-16: Share on a listing or bundle page. A small menu: copy the public
 * link (Scenario 1), or open WhatsApp's or Telegram's own share page with
 * the message filled in (Scenario 2) - the visitor picks who it goes to
 * there. Works signed out; the pages only render it while the item is live
 * (Scenario 4).
 *
 * When the browser refuses the clipboard, the link is shown already
 * selected so it can still be copied by hand.
 *
 * S6-07 shares a member's referral link through it too ("invite"), which
 * changes nothing but the button's accessible name.
 */
export function ShareButton({ url, text, what = "listing" }: { url: string; text: string; what?: "listing" | "bundle" | "invite" }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { show } = useToast();
  useDismiss(rootRef, open, close);

  async function copy() {
    close();
    try {
      await navigator.clipboard.writeText(url);
      setManual(false);
      show("Link copied", "success");
    } catch {
      setManual(true);
    }
  }

  const external = [
    { label: "WhatsApp", href: whatsappShareUrl(url, text), icon: Share2 },
    { label: "Telegram", href: telegramShareUrl(url, text), icon: Send },
  ];
  const itemClass = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted";

  return (
    <div ref={rootRef} className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Share this ${what}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
      >
        <Share2 className="size-4" aria-hidden="true" />
        Share
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lg">
          <button type="button" role="menuitem" onClick={() => void copy()} className={itemClass}>
            <Link2 className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
            Copy link
          </button>
          {external.map(({ label, href, icon: Icon }) => (
            <a key={label} role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onClick={close} className={itemClass}>
              <Icon className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      )}

      {manual && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-white p-3 shadow-lg">
          <label htmlFor="share-link" className="text-xs text-ink-soft">
            Copy this link
          </label>
          <input
            id="share-link"
            readOnly
            value={url}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onBlur={() => setManual(false)}
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-ink-soft"
          />
        </div>
      )}
    </div>
  );
}
