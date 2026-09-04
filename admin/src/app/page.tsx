import { redirect } from "next/navigation";

/** The portal has one section today, so the root is just a signpost to it. */
export default function AdminHome() {
  redirect("/users");
}
