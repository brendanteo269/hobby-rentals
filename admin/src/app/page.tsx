import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** The portal has one section today, so the root is just a signpost to it. */
export default function AdminHome() {
  redirect(ROUTES.users);
}
