export type ActivationPrefill = {
  email: string;
  key: string;
};

const PREFILL_KEY = "ld-activation-prefill";

export function saveActivationPrefill(prefill: ActivationPrefill): void {
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    /* storage unavailable — prefill just won't survive the redirect */
  }
}

export function readActivationPrefill(): ActivationPrefill | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActivationPrefill>;
    if (typeof parsed.email !== "string" || typeof parsed.key !== "string") {
      return null;
    }
    return { email: parsed.email, key: parsed.key };
  } catch {
    return null;
  }
}

export function clearActivationPrefill(): void {
  try {
    sessionStorage.removeItem(PREFILL_KEY);
  } catch {
    /* ignore */
  }
}

/** Extract ?email= and ?key= from a URL search string, tolerating aliases. */
export function activationParamsFromSearch(
  search: string
): ActivationPrefill | null {
  const params = new URLSearchParams(search);
  const email = (params.get("email") ?? "").trim();
  const key = (
    params.get("key") ??
    params.get("license") ??
    params.get("licenseKey") ??
    ""
  )
    .trim()
    .toUpperCase();
  if (!email || !key) return null;
  return { email, key };
}
