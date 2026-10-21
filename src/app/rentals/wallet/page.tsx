import { CreditWallet } from "@/components/credit-wallet";
import { RenterPortal, requireRenter } from "@/components/renter-portal";

export const metadata = { title: "Wallet — HobbyRentals" };

/** The renter's wallet, inside the portal so its tabs stay in reach. The same wallet shows on the profile's Wallet tab. */
export default async function RenterWalletPage() {
  await requireRenter();

  return (
    <RenterPortal active="Wallet" title="Wallet">
      <CreditWallet />
    </RenterPortal>
  );
}
