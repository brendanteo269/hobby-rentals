import { ShieldAlert } from "lucide-react";
import { GuidePhoto, GuidePhotos } from "@/components/guides/guide-photos";
import type { GuideContent } from "@/lib/guides";

/**
 * A quick-start guide as a renter reads it: safety tips first, then the
 * numbered steps, then how to pack it for return. Shared by the renter's page
 * and the owner's preview, so the preview is exactly what renters see.
 *
 * Laid out for print as well as screen: each step keeps together on a page.
 */
export function GuideView({ guide }: { guide: GuideContent }) {
  return (
    <GuidePhotos>
      <div className="space-y-10">
        {guide.safetyTips && (
          <section aria-labelledby="guide-safety" className="break-inside-avoid rounded-lg border-l-2 border-warning bg-warning-soft px-4 py-3">
            <h2 id="guide-safety" className="heading flex items-center gap-2 text-lg">
              <ShieldAlert className="size-5 text-warning" aria-hidden="true" />
              Safety first
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-ink">{guide.safetyTips}</p>
          </section>
        )}

        <section aria-labelledby="guide-steps">
          <h2 id="guide-steps" className="heading text-lg">Steps</h2>
          <ol className="mt-4 space-y-6">
            {guide.steps.map((step, index) => (
              <li key={index} className="flex break-inside-avoid gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="whitespace-pre-line text-ink">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.text}
                  </p>
                  {step.photoUrl && <GuidePhoto src={step.photoUrl} alt={`Step ${index + 1}`} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {guide.returnNotes && (
          <section aria-labelledby="guide-return" className="break-inside-avoid border-t border-line pt-6">
            <h2 id="guide-return" className="heading text-lg">Returning it</h2>
            <p className="body-copy mt-2 whitespace-pre-line">{guide.returnNotes}</p>
          </section>
        )}
      </div>
    </GuidePhotos>
  );
}
