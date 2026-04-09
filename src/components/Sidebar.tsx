"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowUpFromLine,
  List,
  BarChart2,
  History,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Загрузить выписку", icon: ArrowUpFromLine },
  { href: "/dashboard/transactions", label: "Транзакции", icon: List },
  { href: "/dashboard/analytics", label: "Аналитика", icon: BarChart2 },
  { href: "/dashboard/history", label: "История загрузок", icon: History },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-background flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-lg font-semibold">Finance AI</h1>
        <p className="text-xs text-muted-foreground mt-1 truncate">{email}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
