"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

/** True when the user asked the OS for reduced motion. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

/** Flips to true once the element scrolls into view (one-shot). */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}

/**
 * Reveals its children once when scrolled into view.
 * Variants are defined in globals.css (.cc-reveal) and are disabled
 * automatically under prefers-reduced-motion.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: "up" | "scale" | "right" | "panel";
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-variant={variant}
      data-visible={inView ? "true" : "false"}
      className={["cc-reveal", className].join(" ")}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
