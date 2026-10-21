"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, ButtonLink, FormNotice } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { ConfirmReturnButton } from "@/components/bookings/confirm-return-button";
import { completeInspection, startInspection, submitPhoto } from "@/app/bookings/[id]/return/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";
import {
  acceptedCount,
  clientUtcOffsetMinutes,
  type InspectionAngle,
  type InspectionStage,
  type ReturnInspection as Inspection,
  type ReturnPhotoIssue,
  type ReturnState,
} from "@/lib/returns";
import { formatDateTime } from "@/lib/format";

type Stage =
  // Scenario 1: the owner's photo for this angle, before the camera opens.
  | { kind: "preview" }
  | { kind: "camera" }
  // Uploads: the chosen file beside the owner's photo, until confirmed.
  | { kind: "review"; file: File; previewUrl: string }
  | { kind: "checking"; previewUrl: string }
  | { kind: "rejected"; previewUrl: string; issue: ReturnPhotoIssue; label: string };

/**
 * Guided photo capture at pickup (S3-01) or at return (S3-03).
 *
 * Walks the renter through Front, Back, Top and Base/Underside in order. For
 * each, the owner's baseline photo is shown first, then laid over the live
 * camera so the item can be lined up with it. A captured photo goes straight
 * to S3 and then to the server, which checks its quality, timestamp and angle;
 * a refused one comes back with the reason, and the renter retakes it.
 *
 * The in-app camera (getUserMedia) is the main path. At return, where the
 * browser will not give one - no permission, or no camera API - the phone's
 * own camera opens through a file input instead, with the baseline shown
 * above it. At pickup and at return the renter can also upload a saved photo for any angle;
 * it is shown beside the owner's photo to confirm before it is checked. The
 * server's checks are the same either way, the EXIF timestamp check included.
 */
export function ReturnInspection({
  bookingId,
  listingName,
  initial,
  returnState = null,
  rentalActive = true,
  stage = "return",
}: {
  bookingId: string;
  stage?: InspectionStage;
  listingName: string | null;
  initial: Inspection | null;
  /** S3-04: who has confirmed the return, as of the page load. */
  returnState?: ReturnState | null;
  /** False once the rental is returned: nothing left to confirm. */
  rentalActive?: boolean;
}) {
  const [inspection, setInspection] = useState<Inspection | null>(initial);
  const [error, setError] = useState<string>();
  const [starting, startStarting] = useTransition();

  function start() {
    setError(undefined);
    startStarting(async () => {
      const result = await startInspection(bookingId, clientUtcOffsetMinutes(), stage);
      if ("error" in result) setError(result.error);
      else setInspection(result.inspection);
    });
  }

  if (!inspection) {
    return (
      <div className="space-y-6">
        {stage === "pickup" ? (
          <p className="body-copy">
            Before you take {listingName ?? "the item"} away, photograph it from four angles with this app&apos;s
            camera: front, back, top and base. The owner&apos;s own photo of each angle is shown so you can line yours
            up with it. These photos are the record of the condition you received it in, and can&apos;t be changed
            once saved.
          </p>
        ) : (
          <p className="body-copy">
            Before you hand {listingName ?? "the item"} back, photograph it from four angles: front, back, top and
            base. The owner&apos;s own photo of each angle is shown so you can line yours up with it. These photos are
            the record of the condition you returned it in, and can&apos;t be changed once saved.
          </p>
        )}
        <FormNotice message={error} />
        <Button onClick={start} disabled={starting}>
          {starting ? "Starting…" : `Start ${stage} photos`}
        </Button>
      </div>
    );
  }

  if (inspection.status === "COMPLETED") {
    if (stage === "pickup") return <PickupCompleted inspection={inspection} />;
    return (
      <Completed bookingId={bookingId} inspection={inspection} returnState={returnState} rentalActive={rentalActive} />
    );
  }

  return <Capture bookingId={bookingId} inspection={inspection} onChange={setInspection} stage={stage} />;
}

function Capture({
  bookingId,
  inspection,
  onChange,
  stage,
}: {
  bookingId: string;
  inspection: Inspection;
  stage: InspectionStage;
  onChange: (next: Inspection) => void;
}) {
  const current = inspection.angles.find((angle) => angle.angle === inspection.next_angle) ?? null;
  const [step, setStep] = useState<Stage>(() =>
    current?.last_rejection
      ? { kind: "rejected", previewUrl: "", issue: current.last_rejection, label: current.label }
      : { kind: "preview" },
  );
  const [error, setError] = useState<string>();
  const [finishing, startFinishing] = useTransition();
  // Pick a saved photo for this angle, to confirm before it is checked.
  const review = (file: File) => setStep({ kind: "review", file, previewUrl: URL.createObjectURL(file) });

  async function submit(file: File) {
    if (!current) return;
    setError(undefined);
    const capturedAt = new Date().toISOString();
    const previewUrl = URL.createObjectURL(file);
    setStep({ kind: "checking", previewUrl });
    try {
      const key = await putPhotoToS3(file, stage);
      const outcome = await submitPhoto(inspection.id, current.angle, key, capturedAt, stage);
      if ("error" in outcome) {
        setError(outcome.error);
        setStep({ kind: "camera" });
        return;
      }
      const { result } = outcome;
      if (result.accepted) {
        onChange(withAccepted(inspection, result.photo.angle, { ...result.photo, photo_url: previewUrl }));
        setStep({ kind: "preview" });
      } else if (result.issue) {
        setStep({ kind: "rejected", previewUrl, issue: result.issue, label: result.required_angle_label ?? current.label });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That photo failed to upload. Try again.");
      setStep({ kind: "camera" });
    }
  }

  function finish() {
    setError(undefined);
    startFinishing(async () => {
      const result = await completeInspection(bookingId, inspection.id, stage);
      if ("error" in result) setError(result.error);
      else onChange(result.inspection);
    });
  }

  return (
    <div className="space-y-6">
      <Progress angles={inspection.angles} currentAngle={current?.angle ?? null} />

      {current ? (
        <section className="space-y-4">
          <div>
            <p className="eyebrow">
              Photo {inspection.angles.indexOf(current) + 1} of {inspection.angles.length}
            </p>
            <h2 className="heading mt-2 text-2xl">{current.label}</h2>
          </div>

          {step.kind === "preview" && (
            <Preview angle={current} onReady={() => setStep({ kind: "camera" })} onUpload={review} />
          )}
          {step.kind === "camera" && (
            <Camera angle={current} onCapture={submit} allowFallback={stage === "return"} onUpload={review} />
          )}
          {step.kind === "review" && (
            <Review
              angle={current}
              previewUrl={step.previewUrl}
              onConfirm={() => submit(step.file)}
              onReplace={review}
              onCamera={() => setStep({ kind: "camera" })}
            />
          )}
          {step.kind === "checking" && <Checking previewUrl={step.previewUrl} />}
          {step.kind === "rejected" && (
            <Rejected stage={step} onRetake={() => setStep({ kind: "camera" })} onUpload={review} />
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="heading text-2xl">All four photos are in</h2>
          <p className="body-copy">
            Save them to finish. Once saved they are this rental&apos;s {stage} record and can&apos;t be retaken.
          </p>
          <Button onClick={finish} disabled={finishing}>
            {finishing ? "Saving…" : `Save ${stage} photos`}
          </Button>
        </section>
      )}

      <FormNotice message={error} />
    </div>
  );
}

/** The accepted photo slotted in client-side, so the next angle opens without a round trip. */
function withAccepted(inspection: Inspection, angle: string, photo: InspectionAngle["accepted_photo"]): Inspection {
  const angles = inspection.angles.map((entry) =>
    entry.angle === angle ? { ...entry, accepted_photo: photo, last_rejection: null } : entry,
  );
  return { ...inspection, angles, next_angle: angles.find((entry) => !entry.accepted_photo)?.angle ?? null };
}

function Progress({ angles, currentAngle }: { angles: InspectionAngle[]; currentAngle: string | null }) {
  return (
    <ol className="grid grid-cols-4 gap-2 text-xs">
      {angles.map((angle) => (
        <li
          key={angle.angle}
          className={`rounded-lg border px-2 py-2 text-center ${
            angle.accepted_photo
              ? "border-ink bg-ink text-white"
              : angle.angle === currentAngle
                ? "border-ink text-ink"
                : "border-line text-ink-soft"
          }`}
        >
          {angle.accepted_photo ? "✓ " : ""}
          {angle.label}
        </li>
      ))}
    </ol>
  );
}

/** Picks one saved photo. A styled label, so the native file picker opens on click and on keyboard. */
function UploadButton({ onFile, children }: { onFile: (file: File) => void; children: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-within:ring-2 focus-within:ring-accent/40 focus-within:ring-offset-2">
      {children}
      <input
        type="file"
        accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** Scenario 1: the owner's photo of this angle, shown before the camera opens. */
function Preview({
  angle,
  onReady,
  onUpload,
}: {
  angle: InspectionAngle;
  onReady: () => void;
  onUpload?: (file: File) => void;
}) {
  return (
    <div className="space-y-4">
      {angle.baseline_overlay_url ? (
        <>
          <p className="body-copy">
            This is how the owner photographed the {angle.label.toLowerCase()}. Take yours from the same angle - it
            will be laid over the camera to help you line up.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL */}
          <img
            src={angle.baseline_overlay_url}
            alt={`The owner's ${angle.label} photo`}
            className="aspect-[4/3] w-full border border-line bg-surface-muted object-contain"
          />
        </>
      ) : (
        <p className="body-copy">Photograph the item&apos;s {angle.label.toLowerCase()}, filling the frame.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onReady}>{onUpload ? "Take photo" : "Open camera"}</Button>
        {onUpload && <UploadButton onFile={onUpload}>Upload photo</UploadButton>}
      </div>
    </div>
  );
}

/** Uploads: the owner's photo and the chosen one side by side, used only once confirmed. */
function Review({
  angle,
  previewUrl,
  onConfirm,
  onReplace,
  onCamera,
}: {
  angle: InspectionAngle;
  previewUrl: string;
  onConfirm: () => void;
  onReplace: (file: File) => void;
  onCamera: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="body-copy">
        Is this the item&apos;s {angle.label.toLowerCase()}, from the same angle as the owner&apos;s photo?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <figure>
          <figcaption className="text-sm font-medium">Owner&apos;s {angle.label}</figcaption>
          {angle.baseline_overlay_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
            <img
              src={angle.baseline_overlay_url}
              alt={`The owner's ${angle.label} photo`}
              className="mt-2 aspect-[4/3] w-full border border-line bg-surface-muted object-contain"
            />
          ) : (
            <p className="mt-2 flex aspect-[4/3] items-center justify-center border border-line bg-surface-muted text-sm text-ink-soft">
              No owner photo
            </p>
          )}
        </figure>
        <figure>
          <figcaption className="text-sm font-medium">Your photo</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
          <img
            src={previewUrl}
            alt={`Your ${angle.label} photo`}
            className="mt-2 aspect-[4/3] w-full border border-line bg-surface-muted object-contain"
          />
        </figure>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onConfirm}>Confirm {angle.label} photo</Button>
        <UploadButton onFile={onReplace}>Choose a different photo</UploadButton>
        <Button variant="outline" onClick={onCamera}>
          Take photo instead
        </Button>
      </div>
    </div>
  );
}

function Checking({ previewUrl }: { previewUrl: string }) {
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
      <img src={previewUrl} alt="The photo being checked" className="aspect-[4/3] w-full object-contain opacity-70" />
      <p className="text-sm text-ink-soft">Checking the photo…</p>
    </div>
  );
}

/** Scenarios 2-4: the specific problem, the angle still required, and a retake. */
function Rejected({
  stage,
  onRetake,
  onUpload,
}: {
  stage: Extract<Stage, { kind: "rejected" }>;
  onRetake: () => void;
  onUpload?: (file: File) => void;
}) {
  return (
    <div className="space-y-4">
      {stage.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview
        <img src={stage.previewUrl} alt="The photo that was refused" className="aspect-[4/3] w-full object-contain opacity-60" />
      )}
      <div className="rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2" role="alert">
        <p className="font-medium text-ink">Retake the {stage.label} photo</p>
        <p className="mt-1 text-sm text-ink">{stage.issue.message}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onRetake}>Retake photo</Button>
        {onUpload && <UploadButton onFile={onUpload}>Upload a different photo</UploadButton>}
      </div>
    </div>
  );
}

type CameraState = "starting" | "live" | "unavailable";

/**
 * The in-app camera with the baseline over it. Falls back to the phone's own
 * camera through a file input when getUserMedia is missing or refused.
 */
function Camera({
  angle,
  onCapture,
  allowFallback,
  onUpload,
}: {
  angle: InspectionAngle;
  onCapture: (file: File) => void;
  /** Return only: the phone-camera file input when the in-app camera is unavailable. */
  allowFallback: boolean;
  /** Upload a saved photo instead, to review before it is checked. */
  onUpload?: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [overlay, setOverlay] = useState(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    // A browser with no camera API takes the same fallback as a refused permission.
    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        })
      : Promise.reject(new Error("No camera API"));
    request
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState("live");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], `${angle.angle}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  if (state === "unavailable" && !allowFallback) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          The in-app camera isn&apos;t available here (check that this site is allowed to use your camera).
          {onUpload ? " You can upload a photo instead." : ""}
        </p>
        {onUpload && <UploadButton onFile={(file) => onUpload(file)}>Upload {angle.label} photo</UploadButton>}
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          The in-app camera isn&apos;t available here (check that this site is allowed to use your camera). You can
          use your phone&apos;s camera instead.
        </p>
        {angle.baseline_overlay_url && (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
          <img
            src={angle.baseline_overlay_url}
            alt={`The owner's ${angle.label} photo`}
            className="aspect-[4/3] w-full border border-line object-contain"
          />
        )}
        <label className="inline-block cursor-pointer">
          <span className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dark">
            Take {angle.label} photo
          </span>
          <input
            type="file"
            accept={ALLOWED_PHOTO_CONTENT_TYPES.join(",")}
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onCapture(file);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {overlay && angle.baseline_overlay_url && (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
          <img
            src={angle.baseline_overlay_url}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
          />
        )}
        {state === "starting" && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white">Opening camera…</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={capture} disabled={state !== "live"}>
          Take {angle.label} photo
        </Button>
        {angle.baseline_overlay_url && (
          <Button variant="outline" onClick={() => setOverlay((shown) => !shown)}>
            {overlay ? "Hide owner's photo" : "Show owner's photo"}
          </Button>
        )}
        {onUpload && (
          <UploadButton
            onFile={(file) => {
              stop();
              onUpload(file);
            }}
          >
            Upload photo instead
          </UploadButton>
        )}
      </div>
    </div>
  );
}

function Completed({
  bookingId,
  inspection,
  returnState,
  rentalActive,
}: {
  bookingId: string;
  inspection: Inspection;
  returnState: ReturnState | null;
  rentalActive: boolean;
}) {
  const confirmedAt = returnState?.renter_confirmed_at;
  return (
    <div className="space-y-6">
      <FormNotice
        tone="success"
        message={`All ${acceptedCount(inspection)} return photos are saved to this rental's record.`}
      />
      {/* S3-04: the photos are the first half of returning; both sides then confirm. */}
      {rentalActive && !confirmedAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3">
          <p className="body-copy">
            Last step: once the owner has the item, confirm the return. The rental is returned when you and the
            owner have both confirmed.
          </p>
          <ConfirmReturnButton bookingId={bookingId} className="px-4 py-2 text-sm" />
        </div>
      )}
      {rentalActive && confirmedAt && (
        <p className="body-copy">
          You confirmed the return on {formatDateTime(confirmedAt)}.{" "}
          {returnState?.owner_confirmed_at ? "" : "The owner's confirmation is still outstanding."}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {inspection.angles.map((angle) => (
          <li key={angle.angle}>
            <p className="text-sm font-medium">{angle.label}</p>
            {angle.accepted_photo && (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
              <img
                src={angle.accepted_photo.photo_url}
                alt={`Your ${angle.label} return photo`}
                className="mt-2 aspect-square w-full border border-line object-cover"
              />
            )}
          </li>
        ))}
      </ul>
      <ButtonLink href="/profile" variant="outline">
        Back to my bookings
      </ButtonLink>
    </div>
  );
}

/** S3-01, Scenario 6: the pickup record is saved; the handover itself is confirmed separately (S3-02). */
function PickupCompleted({ inspection }: { inspection: Inspection }) {
  return (
    <div className="space-y-6">
      <FormNotice
        tone="success"
        message={`All ${acceptedCount(inspection)} pickup photos are saved to this rental's record${
          inspection.completed_at ? ` (${formatDateTime(inspection.completed_at)})` : ""
        }.`}
      />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {inspection.angles.map((angle) => (
          <li key={angle.angle}>
            <p className="text-sm font-medium">{angle.label}</p>
            {angle.accepted_photo && (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
              <img
                src={angle.accepted_photo.photo_url}
                alt={`Your ${angle.label} pickup photo`}
                className="mt-2 aspect-square w-full border border-line object-cover"
              />
            )}
          </li>
        ))}
      </ul>
      <ButtonLink href="/profile" variant="outline">
        Back to my bookings
      </ButtonLink>
    </div>
  );
}
