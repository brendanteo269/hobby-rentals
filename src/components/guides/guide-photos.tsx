"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "@/components/ui";

const ReportFailure = createContext<() => void>(() => {});

/**
 * Wraps a guide so a step photo that fails to load - most often a signed URL
 * that has expired on a page left open - can say so once, above the guide.
 *
 * Reloading is the renter's choice, never automatic: a refresh that fired on
 * every failure could loop on a photo that is genuinely gone, and would move
 * the page under someone mid-way through the steps.
 */
export function GuidePhotos({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  return (
    <ReportFailure.Provider value={() => setFailed(true)}>
      {failed && (
        <Notice className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <span>Some photos didn&apos;t load.</span>
          <Button
            type="button"
            variant="outline"
            className="px-3 py-1.5 text-xs"
            onClick={() => {
              setFailed(false);
              router.refresh();
            }}
          >
            Reload photos
          </Button>
        </Notice>
      )}
      {children}
    </ReportFailure.Provider>
  );
}

/** One step's photo. Loaded eagerly so a printed guide has every photo in it. */
export function GuidePhoto({ src, alt }: { src: string; alt: string }) {
  const reportFailure = useContext(ReportFailure);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned S3 URL, not an optimizable remote image
    <img
      src={src}
      alt={alt}
      loading="eager"
      onError={reportFailure}
      className="max-h-80 w-full rounded-lg border border-line bg-surface-muted object-contain"
    />
  );
}
