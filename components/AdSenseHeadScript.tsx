import { adsenseScriptSrc, adsenseVerificationClient } from "@/lib/adsense";

/** One server-rendered AdSense loader for every page. Tool units reuse this script. */
export function AdSenseHeadScript() {
  const src = adsenseScriptSrc(adsenseVerificationClient());
  if (!src) return null;

  return <script async src={src} crossOrigin="anonymous" />;
}
