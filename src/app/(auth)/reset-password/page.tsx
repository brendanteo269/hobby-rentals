import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRecoveryMark } from "@/lib/recovery";
import { authErrorPath } from "@/lib/routes";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Choose a new password — HobbyRentals" };

/**
 * Where a reset link lands, once /auth/confirm has verified it.
 *
 * Two things must both hold: a session, which the link established, and the
 * recovery mark proving that is where the session came from. A signed-in
 * member who simply navigates here has the first and not the second, and is
 * turned away — otherwise anyone holding a stolen session could set a new
 * password without knowing the old one, which is the very thing the Account
 * tab re-authenticates to prevent.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // One message for both failures, and it is the honest one: whichever is
  // missing, the link is what should have supplied it.
  if (!user || !(await hasRecoveryMark())) {
    redirect(authErrorPath("reset-link-invalid"));
  }

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">Almost done</p>
      <h1 className="heading mt-3 text-3xl">Choose a new password</h1>
      <p className="body-copy mt-3">
        Setting a new password signs you out everywhere else, on every device.
      </p>

      <ResetPasswordForm />
    </div>
  );
}
