import { redirect } from "next/navigation";
import { profilePath } from "@/lib/routes";

/** The wallet lives on the profile; this keeps the renter portal's old Wallet tab link working. */
export default function RenterWalletPage() {
  redirect(profilePath("wallet"));
}
