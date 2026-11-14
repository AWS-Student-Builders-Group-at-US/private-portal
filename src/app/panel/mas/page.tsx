import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MORE_ITEMS } from "@/components/app-shell/nav-items";
import { SignOutButton } from "@/components/sign-out-button";

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Más</h1>
      <ul className="divide-y rounded-lg border">
        {MORE_ITEMS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted"
            >
              {label}
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {/* The sidebar (with sign-out) is hidden on mobile. */}
      <SignOutButton className="md:hidden" />
    </div>
  );
}
