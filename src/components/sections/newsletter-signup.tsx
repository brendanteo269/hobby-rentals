import { Container, Button, Input } from "@/components/ui";

/**
 * Marketing email capture. Deliberately separate from account registration —
 * leaving an address here does not create an account.
 */
export function NewsletterSignup() {
  return (
    <Container className="pt-20 text-center">
      <p className="text-xs text-ink-soft">Sign up for emails</p>
      <h2 className="display-caps mx-auto mt-3 max-w-lg text-2xl sm:text-3xl">
        New gear, new hobbies, every week
      </h2>
      <form className="mx-auto mt-8 max-w-sm">
        <label htmlFor="newsletter" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter"
          name="email"
          type="email"
          placeholder="Enter your email address"
          className="text-center"
        />
        <Button type="submit" className="mt-4">
          Sign up
        </Button>
      </form>
    </Container>
  );
}
