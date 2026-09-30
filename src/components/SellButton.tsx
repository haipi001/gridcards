"use client";

import Link from "next/link";

// Sell / List-a-card entry. The upload pipeline exists now (→ /sell), so this
// is a real link rather than the roadmap modal it used to open.
export default function SellButton({
  className = "btn",
  label = "Sell",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link className={className} href="/sell/">
      {label}
    </Link>
  );
}
