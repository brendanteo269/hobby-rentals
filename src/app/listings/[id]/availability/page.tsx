import { notFound } from "next/navigation";
import { Container, Button, ButtonLink, Field } from "@/components/ui";
import { getListingAvailability } from "@/lib/api/listings";
import { addBlackout, editBlackout, removeBlackout, saveListingAvailability } from "./actions";
import { WEEKDAY_LABELS } from "@/lib/listings";

export default async function ListingAvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let availability;
  try {
    availability = await getListingAvailability(id);
  } catch {
    notFound();
  }

  return (
    <Container className="py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Listing settings</p>
          <h1 className="heading mt-3 text-3xl">Manage listing availability</h1>
        </div>
        <ButtonLink href={`/listings/${id}/edit`} variant="outline" className="px-4 py-2 text-xs">
          ← Back to listing
        </ButtonLink>
      </div>

      <section className="mt-8 card p-6">
        <h2 className="heading text-lg">Weekly handover schedule</h2>
        <form
          action={async (formData) => {
            "use server";
            await saveListingAvailability(id, formData);
          }}
          className="mt-4 space-y-4"
        >
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="has_custom"
                value="false"
                className="accent-ink"
                defaultChecked={!availability.has_custom_availability}
              />
              Use profile default
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="has_custom"
                value="true"
                className="accent-ink"
                defaultChecked={availability.has_custom_availability}
              />
              Custom schedule for this listing
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <label
                key={label}
                className="cursor-pointer rounded-full border border-line px-3 py-2 text-sm transition-colors has-checked:border-ink has-checked:bg-ink has-checked:text-white"
              >
                <input
                  type="checkbox"
                  name="days"
                  value={index + 1}
                  className="sr-only"
                  defaultChecked={availability.weekly_schedule.includes(index + 1)}
                />
                {label}
              </label>
            ))}
          </div>

          <Button>Save weekly schedule</Button>
        </form>
      </section>

      <section className="mt-6 card p-6">
        <h2 className="heading text-lg">Calendar</h2>
        <p className="body-copy mt-2">Booked dates are reserved and cannot be blacked out.</p>

        <form
          action={async (formData) => {
            "use server";
            await addBlackout(id, formData);
          }}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <Field label="Start" id="blackout_start" required type="date" name="start_date" className="w-auto" />
          <Field label="End" id="blackout_end" required type="date" name="end_date" className="w-auto" />
          <Button>Add blackout</Button>
        </form>

        <h3 className="mt-6 font-medium">Blackout dates</h3>
        <p className="mt-1 text-sm text-ink-soft">
          To free part of a range, change its dates here rather than deleting it and adding a
          shorter one &mdash; renters watching those dates are told the whole range is free in
          between.
        </p>
        <ul className="mt-2 space-y-2">
          {availability.blackouts.map((item) => (
            <li key={item.id} className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-line p-3 text-sm">
              <form
                action={async (formData) => {
                  "use server";
                  await editBlackout(id, item.id, formData);
                }}
                className="flex flex-wrap items-end gap-3"
              >
                <Field
                  label="Start"
                  id={`blackout_start_${item.id}`}
                  required
                  type="date"
                  name="start_date"
                  defaultValue={item.start_date}
                  className="w-auto"
                />
                <Field
                  label="End"
                  id={`blackout_end_${item.id}`}
                  required
                  type="date"
                  name="end_date"
                  defaultValue={item.end_date}
                  className="w-auto"
                />
                <Button variant="outline" className="px-4 py-2 text-xs">
                  Save dates
                </Button>
              </form>
              <form action={removeBlackout.bind(null, id, item.id)}>
                <button className="text-ink-soft underline transition-colors hover:text-ink">Delete</button>
              </form>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 font-medium">Booked dates</h3>
        <ul className="mt-2 space-y-2">
          {availability.confirmed_bookings.map((booking) => (
            <li key={booking.id} className="rounded-lg border border-line bg-surface-muted p-3 text-sm">
              {booking.start_date} to {booking.end_date} — reserved
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
