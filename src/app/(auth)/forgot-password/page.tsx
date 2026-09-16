import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset your password — HobbyRentals" };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">Forgot your password?</p>
      <h1 className="heading mt-3 text-3xl">Reset your password</h1>
      <p className="body-copy mt-3">
        Tell us the address you signed up with and we will send you a link to set a new
        password.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
