"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import brandLogo from "@/media/Gingerandcocoibiza.png";
import centerLogo from "@/media/logo.png";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sales", label: "Ventas" },
  { href: "/payments", label: "Pagos" },
  { href: "/products", label: "Productos" },
  { href: "/suppliers", label: "Proveedores" },
  { href: "/inventory", label: "Inventario" },
  { href: "/invoices", label: "Facturas" },
  { href: "/reports", label: "Reportes" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const runPrefetch = () => {
      for (const item of navItems) {
        router.prefetch(item.href);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleHandle = window.requestIdleCallback(runPrefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleHandle);
    }

    const timeoutHandle = setTimeout(runPrefetch, 400);
    return () => clearTimeout(timeoutHandle);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center justify-start">
            <Image
              src={brandLogo}
              alt="Ginger and Coco Ibiza"
              priority
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="flex items-center justify-center">
            <Image
              src={centerLogo}
              alt="Logo"
              priority
              className="h-12 w-auto object-contain"
            />
          </div>
          <button
            className="justify-self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Cerrar sesion
          </button>
        </div>
      </header>
      <div className="container grid grid-cols-1 gap-6 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-white p-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "block rounded-lg px-4 py-2.5 text-base font-bold shadow-sm transition-shadow",
                  pathname.startsWith(item.href)
                    ? "bg-white text-primary shadow-md"
                    : "bg-white text-primary hover:bg-slate-50 hover:shadow-md"
                )}
                key={item.href}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
