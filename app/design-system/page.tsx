import { notFound } from "next/navigation";
import { DesignSystemPlayground } from "./Playground";

/**
 * Development-only CollaCrew design system playground.
 * Not linked from product navigation, and hard-gated out of production
 * builds (this route sits outside proxy.ts's protected-path matcher,
 * so it would otherwise be publicly reachable).
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignSystemPlayground />;
}
