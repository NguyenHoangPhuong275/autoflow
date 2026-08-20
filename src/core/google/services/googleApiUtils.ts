import { readJson } from '@/core/utils/errors';

interface GoogleApiErrorResponse {
  error?: { message?: string };
}

export async function readGoogleApiError(response: Response, fallback: string): Promise<string> {
  const data = await readJson<GoogleApiErrorResponse>(response, {});
  return data.error?.message || fallback;
}
