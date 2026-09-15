import { notFound } from "next/navigation";
import { Container, Button } from "@/components/ui";
import { getListingAvailability } from "@/lib/api/listings";
import { addBlackout, removeBlackout, saveListingAvailability } from "./actions";
import { WEEKDAY_LABELS } from "@/lib/listings";

export default async function ListingAvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let availability;
  try { availability = await getListingAvailability(id); } catch { notFound(); }
  return <Container className="py-16"><p className="eyebrow">Listing settings</p><h1 className="display-caps mt-3 text-3xl">Availability</h1>
    <section className="mt-8 border border-line bg-white p-6"><h2 className="display-caps text-lg">Weekly handover schedule</h2><form action={async (formData) => { "use server"; await saveListingAvailability(id, formData); }} className="mt-4 space-y-4"><label className="flex gap-2"><input type="radio" name="has_custom" value="false" defaultChecked={!availability.has_custom_availability} />Use profile default</label><label className="flex gap-2"><input type="radio" name="has_custom" value="true" defaultChecked={availability.has_custom_availability} />Custom schedule for this listing</label><div className="flex flex-wrap gap-2">{WEEKDAY_LABELS.map((label, index) => <label className="border border-line px-3 py-2" key={label}><input type="checkbox" name="days" value={index + 1} defaultChecked={availability.weekly_schedule.includes(index + 1)} /> {label}</label>)}</div><Button>Save weekly schedule</Button></form></section>
    <section className="mt-6 border border-line bg-white p-6"><h2 className="display-caps text-lg">Calendar</h2><p className="body-copy mt-2">Booked dates are reserved and cannot be blacked out.</p><form action={async (formData) => { "use server"; await addBlackout(id, formData); }} className="mt-4 flex flex-wrap items-end gap-3"><label>Start<input className="mt-1 block border border-line p-2" required type="date" name="start_date" /></label><label>End<input className="mt-1 block border border-line p-2" required type="date" name="end_date" /></label><Button>Add blackout</Button></form><h3 className="mt-6 font-medium">Blackout dates</h3><ul className="mt-2 space-y-2">{availability.blackouts.map((item) => <li className="flex justify-between border border-line p-3" key={item.id}>{item.start_date} to {item.end_date}<form action={removeBlackout.bind(null, id, item.id)}><button className="underline">Delete</button></form></li>)}</ul><h3 className="mt-6 font-medium">Booked dates</h3><ul className="mt-2 space-y-2">{availability.confirmed_bookings.map((booking) => <li className="border border-line bg-sand p-3" key={booking.id}>{booking.start_date} to {booking.end_date} — reserved</li>)}</ul></section>
  </Container>;
}
