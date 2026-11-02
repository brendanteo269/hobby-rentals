import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { HELP_SECTIONS, sectionText } from "@/lib/help";

// The content is compiled in, so the response is built once at build time.
export const dynamic = "force-static";

/**
 * The help centre as plain text, for the API's AI assistant to embed and
 * cite. Each section's hash lets the API re-embed only what changed since
 * its last sync.
 */
export function GET() {
  const sections = HELP_SECTIONS.map((section) => {
    const text = sectionText(section);
    return {
      slug: section.slug,
      topic: section.topic,
      title: section.title,
      text,
      hash: createHash("sha256").update(`${section.title}\n${text}`).digest("hex"),
    };
  });
  return NextResponse.json({ sections });
}
