import { redirect } from "next/navigation";
import { profilePath } from "@/lib/routes";

/** Account settings live on the profile; this keeps the renter portal's old Profile tab link working. */
export default function RenterProfilePage() {
  redirect(profilePath("account"));
}
