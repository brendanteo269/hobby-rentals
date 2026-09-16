import { AuthForm } from "@/components/auth-form";
import { logIn } from "@/app/auth/actions";
import { loginNotice } from "@/lib/session-policy";

export const metadata = { title: "Log in — HobbyRentals" };

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return <AuthForm mode="login" action={logIn} notice={loginNotice(reason)} />;
}
