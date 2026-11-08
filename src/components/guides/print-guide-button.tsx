"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Scenario 5: opens the browser's print dialog, where "Save as PDF" is a
 * destination on every major browser. Labelled as printing, not downloading,
 * because no file is generated here.
 */
export function PrintGuideButton() {
  return (
    <Button type="button" variant="outline" className="gap-2 px-4 py-2 text-xs" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      Print / save as PDF
    </Button>
  );
}
