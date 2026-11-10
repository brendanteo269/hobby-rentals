import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/auth/actions";
import { initialReferralCode } from "@/lib/referrals";
import { rememberedReferralCode } from "@/lib/referral-cookie";

export const metadata = { title: "Create your account — HobbyRentals" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  // S6-07: the referral link's code, else one remembered from an earlier
  // visit through a link. This is the only place the remembered code is
  // used: the action sends whatever is in the field, so clearing it declines
  // the referral.
  const { ref } = await searchParams;
  const referralCode = initialReferralCode(ref, await rememberedReferralCode());

  return <AuthForm mode="signup" action={signUp} referralCode={referralCode} />;
}
