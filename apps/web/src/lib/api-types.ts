/** Wire contracts for JSON route handlers consumed by TanStack Query on the client. */
export interface LookupResponse {
  person: { nid: string; nameBn: string; nameEn: string; dob: string; gender: string; divisionCode: string; occupation: string; isDeceased: boolean };
  household: { upazila: string; union: string; members: number };
  score: number;
  accounts: Array<{ provider: string; account: string; kycVerified: boolean }>;
  programs: Array<{
    id: string; code: string; nameBn: string; nameEn: string; amount: number;
    enrollmentStatus: string | null; eligible: boolean; failed: string[];
  }>;
}

export type ApiError = { error: string };
