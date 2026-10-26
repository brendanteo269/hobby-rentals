import { unstable_rethrow } from "next/navigation";

/**
 * S4-10: the similar listings are supplementary, so a failed load reads the
 * same as having nothing to recommend and never costs the renter the page.
 * Next's own control-flow errors (the login redirect on an expired session,
 * a 404) are not failures, so they are let through.
 */
export async function loadOrEmpty<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}
