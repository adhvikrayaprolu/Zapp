import { apiRequest } from "./client";

export type Merchant = {
  id: number;
  name: string;
  category: string;
  logo_url?: string;
  website?: string;
};

/** Merchant catalog; requires an authenticated session (sent via cookies). */
export const MerchantsAPI = {
  list: async (opts?: { signal?: AbortSignal }): Promise<Merchant[]> => {
    const data = await apiRequest<Merchant[] | { results?: Merchant[]; data?: Merchant[] }>(
      "/api/merchants/",
      { signal: opts?.signal }
    );
    return Array.isArray(data) ? data : (data?.results ?? data?.data ?? []);
  },
  get: (id: number) => apiRequest<Merchant>(`/api/merchants/${id}/`),
};
