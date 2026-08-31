import type { Route } from "next";
import { ButtonLink, ImageSlot } from "@/components/ui";

/**
 * Half text, half image. `imageSide` mirrors the layout so consecutive panels
 * alternate, which is what stops the page reading as a column of identical
 * blocks.
 */
export function SplitPanel({
  title,
  body,
  ctaLabel,
  ctaHref,
  imageLabel,
  imageSide = "right",
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: Route;
  imageLabel: string;
  imageSide?: "left" | "right";
}) {
  const image = <ImageSlot label={imageLabel} className="min-h-[320px]" />;
  const text = (
    <div className="flex flex-col items-center justify-center bg-sand px-8 py-16 text-center">
      <h2 className="display-caps text-2xl sm:text-3xl">{title}</h2>
      <p className="body-copy mt-4 max-w-sm">{body}</p>
      <ButtonLink href={ctaHref} variant="outline" className="mt-6 bg-cream">
        {ctaLabel}
      </ButtonLink>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2">
      {imageSide === "left" ? (
        <>
          {image}
          {text}
        </>
      ) : (
        <>
          {text}
          {image}
        </>
      )}
    </div>
  );
}
