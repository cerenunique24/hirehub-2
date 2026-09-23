import Link from "next/link";
import Image from "next/image";

/** CollaCrew wordmark, used on landing/auth surfaces. */
export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={["flex items-center", className].join(" ")} aria-label="CollaCrew">
      <Image src="/logo.png" alt="CollaCrew" width={147} height={28} priority />
    </Link>
  );
}

export default Logo;
