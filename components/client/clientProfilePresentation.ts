/** Keep discovery filters on an internal client directory URL only. */
export function safeClientProfileReturn(value: string | null) {
  if (!value) return "/client/freelancers";
  try {
    const url = new URL(value, "https://local.invalid");
    return url.origin === "https://local.invalid" && url.pathname === "/client/freelancers" ? url.pathname + url.search : "/client/freelancers";
  } catch { return "/client/freelancers"; }
}
