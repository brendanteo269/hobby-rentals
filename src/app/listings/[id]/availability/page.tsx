import { notFound } from "next/navigation";
import { Container, Button, Field } from "@/components/ui";
import { getListingAvailability } from "@/lib/api/listings";
import { addBlackout, removeBlackout, saveListingAvailability } from "./actions";
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
      <p className="eyebrow">Listing settings</p>
      <h1 className="heading mt-3 text-3xl">Availability</h1>

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
        <ul className="mt-2 space-y-2">
          {availability.blackouts.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
              {item.start_date} to {item.end_date}
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
