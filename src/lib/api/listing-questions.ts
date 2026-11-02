import "server-only";
import { backendRequest } from "@/lib/api/client";
import type { NeedsConfirmation } from "@/lib/conversations";
import type { ForwardedQuestion, InstantAnswer, OwnerQuestion, OwnerQuestions, PublicQuestion } from "@/lib/listing-questions";

const listingPath = (listingId: string) => `/listings/${encodeURIComponent(listingId)}`;

export const askAboutListing = (listingId: string, question: string) =>
  backendRequest<InstantAnswer>(`${listingPath(listingId)}/ask`, { method: "POST", body: JSON.stringify({ question }) });

/** Sent as a message in the renter's enquiry thread, so the S4-15 checks may hold it first. */
export const forwardQuestion = (listingId: string, question: string, confirmationId?: string) =>
  backendRequest<ForwardedQuestion | NeedsConfirmation>(`${listingPath(listingId)}/questions`, {
    method: "POST",
    body: JSON.stringify({ question, confirmation_id: confirmationId }),
  });

export const getPublicQuestions = (listingId: string) => backendRequest<PublicQuestion[]>(`${listingPath(listingId)}/questions/public`);

export const getOwnerQuestions = (listingId: string) => backendRequest<OwnerQuestions>(`${listingPath(listingId)}/questions`);

export const answerListingQuestion = (questionId: string, answer: string, showOnListing: boolean, confirmationId?: string) =>
  backendRequest<OwnerQuestion | NeedsConfirmation>(`/listing-questions/${encodeURIComponent(questionId)}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer, show_on_listing: showOnListing, confirmation_id: confirmationId }),
  });

export const setQuestionVisibility = (questionId: string, showOnListing: boolean) =>
  backendRequest<OwnerQuestion>(`/listing-questions/${encodeURIComponent(questionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ show_on_listing: showOnListing }),
  });
