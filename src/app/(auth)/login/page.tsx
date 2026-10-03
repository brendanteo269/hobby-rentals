import { AuthForm } from "@/components/auth-form";
import { logIn } from "@/app/auth/actions";
import { loginNotice } from "@/lib/session-policy";
import { safeNextPath } from "@/lib/routes";

export const metadata = { title: "Log in — HobbyRentals" };

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>;
}) {
  const { reason, next } = await searchParams;

  return (
    <AuthForm mode="login" action={logIn} notice={loginNotice(reason)} next={safeNextPath(next)} />
  );
}
