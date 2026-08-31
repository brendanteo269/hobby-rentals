import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/auth/actions";

export const metadata = { title: "Create your account — HobbyRentals" };

export default function SignUpPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
