import { Container } from "@/components/ui";
import { KitCheckout } from "@/components/bundles/kit-checkout";

export const metadata = { title: "Request your bundle — HobbyRentals" };

/**
 * S5-09: one checkout for a cross-owner bundle. The bundle itself was built
 * and edited in the browser, so the page that prices and requests it is a
 * client component that picks it up from there.
 */
export default function KitCheckoutPage() {
  return (
    <Container className="pb-16 pt-10">
      <h1 className="heading text-3xl">Request your bundle</h1>
      <p className="body-copy mt-2 max-w-2xl">
        One price breakdown for every owner, and one request. Your wallet is held for each owner&apos;s items until they answer.
      </p>
      <div className="mt-8">
        <KitCheckout />
      </div>
    </Container>
  );
}
