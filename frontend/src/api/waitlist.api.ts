import { apiRequest } from "./client";

export type WaitlistSignupRequest = {
  name: string;
  email: string;
  source?: string;
};

export type WaitlistSignupResponse = {
  id: number;
  name: string;
  email: string;
  source: string;
  created: boolean;
  created_at: string;
};

export function submitWaitlistSignup(payload: WaitlistSignupRequest) {
  return apiRequest<WaitlistSignupResponse>("/api/waitlist-signups/", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      source: payload.source ?? "landing_page",
    }),
  });
}
