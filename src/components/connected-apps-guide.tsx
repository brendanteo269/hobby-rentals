"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronRight, Copy, FileLock2, KeyRound, MessageCircle, Sparkles } from "lucide-react";
import {
  ASSISTANT_HEADER_FILE,
  DESKTOP_CONFIG,
  DESKTOP_CONFIG_LINES,
  FIND_PATHS_COMMAND,
  SAVE_TOKEN_COMMAND,
} from "@/lib/assistant-guide";

/** Copies text to the clipboard. Shared with the one-time token, which is the first thing a member copies. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted"
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

const JOURNEY = [
  { icon: KeyRound, label: "Your token" },
  { icon: FileLock2, label: "Private file" },
  { icon: Sparkles, label: "Claude Desktop" },
  { icon: MessageCircle, label: "HobbyRentals" },
];

/** Where the token goes, drawn once so each step below has somewhere to point. */
function Journey() {
  return (
    <ol
      className="flex flex-wrap items-center gap-x-1 gap-y-3 rounded-lg bg-surface-muted p-4"
      aria-label="The token goes from this page into a private file, which Claude Desktop uses to reach HobbyRentals"
    >
      {JOURNEY.map(({ icon: Icon, label }, index) => (
        <li key={label} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight
              className="size-4 shrink-0 text-accent motion-safe:animate-pulse"
              style={{ animationDelay: `${index * 300}ms` }}
              aria-hidden="true"
            />
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium">
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white"
      >
        {number}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="body-copy mt-2 space-y-3 text-sm">{children}</div>
      </div>
    </li>
  );
}

/** A terminal window, so a member new to one can match it to what they see. */
function Terminal({ command }: { command: string }) {
  return (
    <div className="overflow-hidden rounded-lg bg-dark">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-xs text-white/60">Terminal</span>
        <CopyButton text={command} />
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-white">
        <code>{command}</code>
      </pre>
    </div>
  );
}

/** The config with the token's lines picked out, which is the only part that differs from the read-only setup. */
function ConfigFile() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="truncate text-xs text-ink-soft">claude_desktop_config.json</span>
        <CopyButton text={DESKTOP_CONFIG} />
      </div>
      <pre className="overflow-x-auto py-3 text-xs leading-relaxed text-ink">
        <code>
          {DESKTOP_CONFIG_LINES.map((line, index) => (
            <span
              key={index}
              className={`block px-3 ${"isToken" in line ? "border-l-2 border-accent bg-accent-soft font-medium" : ""}`}
            >
              {line.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-white px-2 py-1 text-xs font-medium text-ink shadow-sm">{children}</kbd>
  );
}

/** What success looks like. An illustration of a chat, not a live one. */
function ExampleChat() {
  return (
    <figure className="rounded-lg border border-line bg-surface-muted p-3">
      <figcaption className="sr-only">Example of asking Claude for your bookings</figcaption>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-white px-3 py-2 text-xs text-ink shadow-sm">
        List my HobbyRentals bookings
      </p>
      <p className="mt-2 w-fit max-w-[85%] rounded-2xl bg-ink px-3 py-2 text-xs text-white motion-safe:animate-pulse">
        Used hobbyrentals: list my bookings
      </p>
      <p className="mt-2 text-center text-xs text-ink-soft">Example only. Claude&apos;s wording will vary.</p>
    </figure>
  );
}

/**
 * S5-05: from a copied token to a working assistant. Written for this project's
 * local setup: Claude Desktop on a Mac, on the same computer as the HobbyRentals
 * API, which it reaches at localhost. Opens by itself once a token exists.
 */
export function ConnectedAppsGuide({ open }: { open: boolean }) {
  return (
    <details open={open} className="mt-4 max-w-2xl rounded-lg border border-line p-4">
      <summary className="cursor-pointer text-sm font-medium">How to connect Claude Desktop</summary>
      <div className="mt-4">
        <Journey />
        <p className="body-copy mt-4 text-sm">
          You&apos;ll need a Mac with Claude Desktop and{" "}
          <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            Node.js
          </a>
          , on the same computer that is running HobbyRentals.
        </p>

        <ol className="mt-6 space-y-8">
          <Step number={1} title="Create a token and copy it">
            <p>Use the form above, then choose Copy. The next step reads the token from your clipboard, so copy nothing else in between.</p>
          </Step>
          <Step number={2} title="Save it in a private file">
            <p>Open the Terminal app, then paste and run this:</p>
            <Terminal command={SAVE_TOKEN_COMMAND} />
            <p>
              This saves the token in <code className="break-all text-xs">{ASSISTANT_HEADER_FILE}</code>, which only your
              account can read. Nothing appears on screen when it works.
            </p>
          </Step>
          <Step number={3} title="Tell Claude Desktop where the file is">
            <p>
              In Claude Desktop, open Settings, go to <strong className="font-medium text-ink">Local MCP servers</strong> and
              choose <strong className="font-medium text-ink">Edit config</strong>. If that opens a folder, open{" "}
              <code className="text-xs">claude_desktop_config.json</code> in a text editor. Add the{" "}
              <code className="text-xs">hobbyrentals</code> entry below inside{" "}
              <code className="text-xs">mcpServers</code>, and keep anything else already in the file.
            </p>
            <ConfigFile />
            <p>
              Replace <code className="text-xs">/Users/you</code> and <code className="text-xs">/usr/local/bin/npx</code> with
              your own paths, which this prints. Write them out in full, without <code className="text-xs">~</code>.
            </p>
            <Terminal command={FIND_PATHS_COMMAND} />
          </Step>
          <Step number={4} title="Restart Claude Desktop">
            <p className="flex flex-wrap items-center gap-2">
              Quit it completely with <Key>⌘ Cmd</Key> <span aria-hidden="true">+</span> <Key>Q</Key>, then reopen it. Closing the
              window isn&apos;t enough.
            </p>
          </Step>
          <Step number={5} title="Try it">
            <p>In a new chat, ask Claude to list your HobbyRentals bookings.</p>
            <ExampleChat />
            <p>
              <strong className="font-medium text-ink">If Claude says it needs a token:</strong> check the token is still listed
              above and that step 2 ran straight after you copied it, then restart Claude Desktop again.
            </p>
          </Step>
        </ol>

        <p className="body-copy mt-8 border-t border-line pt-4 text-sm">
          Claude should show you a summary and ask before sending a request. A request holds the total from your wallet until
          the owner responds, so read the summary before you agree. To replace a token, repeat steps 1, 2 and 4.
        </p>
      </div>
    </details>
  );
}
