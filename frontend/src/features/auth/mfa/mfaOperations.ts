import { apiRequest } from "@/api/client";

export type MfaFactorView = {
  id: string;
  friendlyName: string;
  factorType: string;
  status: string;
};

export type MfaSnapshot = {
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
  factors: MfaFactorView[];
};

type MfaFactorApi = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};

type MfaSnapshotApi = {
  current_level: "aal1" | "aal2" | null;
  next_level: "aal1" | "aal2" | null;
  factors: MfaFactorApi[];
};

function mapSnapshot(data: MfaSnapshotApi): MfaSnapshot {
  const factors: MfaFactorView[] = (data.factors ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? "Authenticator",
    factorType: f.factor_type,
    status: f.status,
  }));
  return {
    currentLevel: data.current_level ?? null,
    nextLevel: data.next_level ?? null,
    factors,
  };
}

export async function getMfaSnapshot(): Promise<MfaSnapshot> {
  const data = await apiRequest<MfaSnapshotApi>("/api/auth/mfa/snapshot/", { requireAuth: true });
  return mapSnapshot(data);
}

export type TotpEnrollResponse = {
  id: string;
  totp?: { qr_code?: string; secret?: string };
};

export async function enrollTotpFactor(friendlyName = "Authenticator app") {
  return apiRequest<TotpEnrollResponse>("/api/auth/mfa/enroll/", {
    requireAuth: true,
    method: "POST",
    body: JSON.stringify({ friendly_name: friendlyName }),
  });
}

/** Complete TOTP enrollment with a code from the authenticator app. */
export async function verifyTotpEnrollment(factorId: string, code: string) {
  return apiRequest<unknown>("/api/auth/mfa/verify-enrollment/", {
    requireAuth: true,
    method: "POST",
    body: JSON.stringify({ factor_id: factorId, code: code.replace(/\s/g, "") }),
  });
}

/** Elevate session to AAL2 when MFA is already enrolled (challenge + verify). */
export async function verifyMfaChallenge(factorId: string, code: string) {
  const challenge = await apiRequest<{ challenge_id: string; expires_at?: string | null }>("/api/auth/mfa/challenge/", {
    requireAuth: true,
    method: "POST",
    body: JSON.stringify({ factor_id: factorId }),
  });
  return apiRequest<unknown>("/api/auth/mfa/verify/", {
    requireAuth: true,
    method: "POST",
    body: JSON.stringify({
      factor_id: factorId,
      challenge_id: challenge.challenge_id,
      code: code.replace(/\s/g, ""),
    }),
  });
}

export async function unenrollFactor(factorId: string): Promise<void> {
  await apiRequest<null>(`/api/auth/mfa/factors/${encodeURIComponent(factorId)}/`, {
    requireAuth: true,
    method: "DELETE",
  });
}
