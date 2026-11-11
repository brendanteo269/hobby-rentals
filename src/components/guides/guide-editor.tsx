"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, FormError, FormNotice, FormSection, Modal, TextareaField } from "@/components/ui";
import { GuideView } from "@/components/guides/guide-view";
import { GuideStepCard, releasePreview, type DraftStep } from "@/components/guides/guide-step-card";
import type { GuideFormState } from "@/app/listings/[id]/guide/actions";
import { formatDate } from "@/lib/format";
import { MAX_GUIDE_NOTES_CHARS, MAX_GUIDE_STEPS, type OwnerGuide } from "@/lib/guides";

function draftFrom(step: OwnerGuide["steps"][number], index: number): DraftStep {
  return { id: `saved-${index}`, text: step.text, photoKey: step.photo_key, photoUrl: step.photo_url, uploading: false, uploadError: null };
}

/** An empty step. `id` is fixed for the first one, rendered on the server too, and random for any added later. */
function emptyStep(id: string): DraftStep {
  return { id, text: "", photoKey: null, photoUrl: null, uploading: false, uploadError: null };
}

/**
 * S6-02 Scenario 1: the owner's quick-start guide form - safety tips, up to
 * ten numbered steps and return-packing notes - saved as a whole. A new guide
 * starts with one empty step so the page never opens blank. "Preview" shows
 * exactly what a renter will see, unsaved edits included.
 */
export function GuideEditor({
  action,
  guide,
}: {
  action: (previous: GuideFormState, formData: FormData) => Promise<GuideFormState>;
  guide: OwnerGuide | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.fieldErrors ?? {};

  const [safetyTips, setSafetyTips] = useState(guide?.safety_tips ?? "");
  const [returnNotes, setReturnNotes] = useState(guide?.return_notes ?? "");
  const [steps, setSteps] = useState<DraftStep[]>(() => (guide?.steps.length ? guide.steps.map(draftFrom) : [emptyStep("first")]));
  const [previewing, setPreviewing] = useState(false);
  const uploading = steps.some((step) => step.uploading);
  const lastSaved = state?.savedAt ?? guide?.updated_at;

  const update = (id: string, patch: Partial<DraftStep>) =>
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  const move = (index: number, offset: -1 | 1) =>
    setSteps((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  const remove = (id: string) =>
    setSteps((current) => {
      releasePreview(current.find((step) => step.id === id)?.photoUrl ?? null);
      return current.filter((step) => step.id !== id);
    });

  const errorMessages = Object.values(errors);

  return (
    <>
      <form action={formAction} className="space-y-6">
        <FormSection title="Safety tips">
          <TextareaField
            label="Safety tips"
            id="safety_tips"
            name="safety_tips"
            rows={4}
            maxLength={MAX_GUIDE_NOTES_CHARS}
            value={safetyTips}
            onChange={(event) => setSafetyTips(event.target.value)}
            placeholder="e.g. Wear the gloves provided. Never run it on wet ground."
            hint={`Optional. Shown first, before any steps. ${safetyTips.length}/${MAX_GUIDE_NOTES_CHARS}`}
            error={errors.safety_tips}
          />
        </FormSection>

        <FormSection title={`Steps (${steps.length} of ${MAX_GUIDE_STEPS})`}>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <GuideStepCard
                key={step.id}
                step={step}
                index={index}
                count={steps.length}
                error={{ text: errors[`steps.${index}.text`], photo_key: errors[`steps.${index}.photo_key`] }}
                onChange={(patch) => update(step.id, patch)}
                onMove={(offset) => move(index, offset)}
                onRemove={() => remove(step.id)}
              />
            ))}
          </ol>
          {errors.steps && <p role="alert" className="text-xs text-accent-dark">{errors.steps}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={steps.length >= MAX_GUIDE_STEPS}
              onClick={() => setSteps((current) => [...current, emptyStep(crypto.randomUUID())])}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add step
            </Button>
            {steps.length >= MAX_GUIDE_STEPS && <span className="text-xs text-ink-soft">Guides have up to {MAX_GUIDE_STEPS} steps.</span>}
          </div>
        </FormSection>

        <FormSection title="Returning it">
          <TextareaField
            label="Packing notes"
            id="return_notes"
            name="return_notes"
            rows={4}
            maxLength={MAX_GUIDE_NOTES_CHARS}
            value={returnNotes}
            onChange={(event) => setReturnNotes(event.target.value)}
            placeholder="e.g. Dry the fly before packing. Poles go in the side sleeve."
            hint={`Optional. ${returnNotes.length}/${MAX_GUIDE_NOTES_CHARS}`}
            error={errors.return_notes}
          />
        </FormSection>

        <div className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
          <FormError message={state?.error} />
          {errorMessages.length > 0 && (
            <div role="alert" className="mb-4 border-l-2 border-accent bg-accent-soft px-4 py-3 text-sm text-accent-dark">
              <p className="font-medium">Please fix the following before saving:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {errorMessages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
              </ul>
            </div>
          )}
          {state?.savedAt && !pending && <div className="mb-4"><FormNotice tone="success" message="Guide saved. Renters with a current booking see this version now." /></div>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || uploading}>
              {pending ? "Saving…" : uploading ? "Waiting for photos…" : "Save guide"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setPreviewing(true)}>
              Preview as renter
            </Button>
          </div>
          {lastSaved && <p className="body-copy mt-4">Last updated {formatDate(lastSaved)}</p>}
        </div>
      </form>

      {/* Outside the form: the modal's close button would otherwise submit it. */}
      {previewing && (
        <Modal title="What renters see" onClose={() => setPreviewing(false)}>
          <div className="mt-6">
            <GuideView
              guide={{
                safetyTips: safetyTips.trim() || null,
                returnNotes: returnNotes.trim() || null,
                steps: steps.filter((step) => step.text.trim()).map((step) => ({ text: step.text, photoUrl: step.photoUrl })),
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
