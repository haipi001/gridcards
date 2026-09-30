"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "Sell" intentionally absent: the top-right Sell button is the one entry
// point, keeping the nav to seven scannable items.
const items = [
  { href: "/", label: "Market" },
  { href: "/archive", label: "1/1 Archive" },
  { href: "/collections", label: "Collections" },
  { href: "/market", label: "Marketplace" },
  { href: "/activity", label: "Activity" },
  { href: "/community", label: "Community" },
  { href: "/orders", label: "Orders" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="主导航">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "active" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
