import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in — HobbyRentals Admin" };

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <LoginForm />
    </div>
  );
}
