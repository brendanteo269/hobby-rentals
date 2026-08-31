import { AuthForm } from "@/components/auth-form";
import { logIn } from "@/app/auth/actions";

export const metadata = { title: "Log in — HobbyRentals" };

export default function LogInPage() {
  return <AuthForm mode="login" action={logIn} />;
}
