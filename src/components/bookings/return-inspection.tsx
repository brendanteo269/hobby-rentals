"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, ButtonLink, FormNotice } from "@/components/ui";
import { putPhotoToS3 } from "@/components/listings/photo-upload-field";
import { completeInspection, startInspection, submitPhoto } from "@/app/bookings/[id]/return/actions";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";
import {
  acceptedCount,
  clientUtcOffsetMinutes,
  type InspectionAngle,
  type ReturnInspection as Inspection,
  type ReturnPhotoIssue,
} from "@/lib/returns";

type Stage =
  // Scenario 1: the owner's photo for this angle, before the camera opens.
  | { kind: "preview" }
  | { kind: "camera" }
  | { kind: "checking"; previewUrl: string }
  | { kind: "rejected"; previewUrl: string; issue: ReturnPhotoIssue; label: string };

/**
 * Guided return photo capture.
 *
 * Walks the renter through Front, Back, Top and Base/Underside in order. For
 * each, the owner's baseline photo is shown first, then laid over the live
 * camera so the item can be lined up with it. A captured photo goes straight
 * to S3 and then to the server, which checks its quality, timestamp and angle;
 * a refused one comes back with the reason, and the renter retakes it.
 *
 * The in-app camera (getUserMedia) is the main path. Where the browser will
 * not give one - no permission, or no camera API - the phone's own camera
 * opens through a file input instead, with the baseline shown above it.
 */
export function ReturnInspection({
  bookingId,
  listingName,
  initial,
}: {
  bookingId: string;
  listingName: string | null;
  initial: Inspection | null;
}) {
  const [inspection, setInspection] = useState<Inspection | null>(initial);
  const [error, setError] = useState<string>();
  const [starting, startStarting] = useTransition();

  function start() {
    setError(undefined);
    startStarting(async () => {
      const result = await startInspection(bookingId, clientUtcOffsetMinutes());
      if ("error" in result) setError(result.error);
      else setInspection(result.inspection);
    });
  }

  if (!inspection) {
    return (
      <div className="space-y-6">
        <p className="body-copy">
          Before you hand {listingName ?? "the item"} back, photograph it from four angles: front, back, top and
          base. The owner&apos;s own photo of each angle is shown so you can line yours up with it. These photos are
          the record of the condition you returned it in, and can&apos;t be changed once saved.
        </p>
        <FormNotice message={error} />
        <Button onClick={start} disabled={starting}>
          {starting ? "Starting…" : "Start return photos"}
        </Button>
      </div>
    );
  }

  if (inspection.status === "COMPLETED") return <Completed inspection={inspection} />;

  return <Capture bookingId={bookingId} inspection={inspection} onChange={setInspection} />;
}

function Capture({
  bookingId,
  inspection,
  onChange,
}: {
  bookingId: string;
  inspection: Inspection;
  onChange: (next: Inspection) => void;
}) {
  const current = inspection.angles.find((angle) => angle.angle === inspection.next_angle) ?? null;
  const [stage, setStage] = useState<Stage>(() =>
    current?.last_rejection
      ? { kind: "rejected", previewUrl: "", issue: current.last_rejection, label: current.label }
      : { kind: "preview" },
  );
  const [error, setError] = useState<string>();
  const [finishing, startFinishing] = useTransition();

  async function submit(file: File) {
    if (!current) return;
    setError(undefined);
    const capturedAt = new Date().toISOString();
    const previewUrl = URL.createObjectURL(file);
    setStage({ kind: "checking", previewUrl });
    try {
      const key = await putPhotoToS3(file, "return");
      const outcome = await submitPhoto(inspection.id, current.angle, key, capturedAt);
      if ("error" in outcome) {
        setError(outcome.error);
        setStage({ kind: "camera" });
        return;
      }
      const { result } = outcome;
      if (result.accepted) {
        onChange(withAccepted(inspection, result.photo.angle, { ...result.photo, photo_url: previewUrl }));
        setStage({ kind: "preview" });
      } else if (result.issue) {
        setStage({ kind: "rejected", previewUrl, issue: result.issue, label: result.required_angle_label ?? current.label });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That photo failed to upload. Try again.");
      setStage({ kind: "camera" });
    }
  }

  function finish() {
    setError(undefined);
    startFinishing(async () => {
      const result = await completeInspection(bookingId, inspection.id);
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

          {stage.kind === "preview" && <Preview angle={current} onReady={() => setStage({ kind: "camera" })} />}
          {stage.kind === "camera" && <Camera angle={current} onCapture={submit} />}
          {stage.kind === "checking" && <Checking previewUrl={stage.previewUrl} />}
          {stage.kind === "rejected" && (
            <Rejected stage={stage} onRetake={() => setStage({ kind: "camera" })} />
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="heading text-2xl">All four photos are in</h2>
          <p className="body-copy">
            Save them to finish. Once saved they are this rental&apos;s return record and can&apos;t be retaken.
          </p>
          <Button onClick={finish} disabled={finishing}>
            {finishing ? "Saving…" : "Save return photos"}
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

/** Scenario 1: the owner's photo of this angle, shown before the camera opens. */
function Preview({ angle, onReady }: { angle: InspectionAngle; onReady: () => void }) {
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
      <Button onClick={onReady}>Open camera</Button>
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
}: {
  stage: Extract<Stage, { kind: "rejected" }>;
  onRetake: () => void;
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
      <Button onClick={onRetake}>Retake photo</Button>
    </div>
  );
}

type CameraState = "starting" | "live" | "unavailable";

/**
 * The in-app camera with the baseline over it. Falls back to the phone's own
 * camera through a file input when getUserMedia is missing or refused.
 */
function Camera({ angle, onCapture }: { angle: InspectionAngle; onCapture: (file: File) => void }) {
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
      </div>
    </div>
  );
}

function Completed({ inspection }: { inspection: Inspection }) {
  return (
    <div className="space-y-6">
      <FormNotice
        tone="success"
        message={`All ${acceptedCount(inspection)} return photos are saved to this rental's record.`}
      />
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
