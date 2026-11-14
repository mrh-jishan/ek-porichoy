"use client";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@ep/ui";
import { Link, usePathname } from "@/i18n/navigation";
import { usePreferences } from "@/stores/preferences";

interface Item { href: string; label: string; icon: ReactNode }

function NavList({ items, onNavigate }: { items: Item[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = items.map((i) => i.href).filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <li key={item.href} className="relative">
            {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "text-white" : "text-muted hover:bg-brand-50 hover:text-brand-800")}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({ items, title }: { items: Item[]; title: string }) {
  const { sidebarOpen, setSidebar } = usePreferences();
  return (
    <>
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 border-r border-line bg-white px-3 py-6 lg:block">
        <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-muted uppercase">{title}</p>
        <NavList items={items} />
      </aside>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-brand-950/40" aria-label="Close" onClick={() => setSidebar(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 bg-white p-4 shadow-lift"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="px-3 text-xs font-semibold tracking-wider text-muted uppercase">{title}</p>
                <button onClick={() => setSidebar(false)} className="rounded p-1 text-muted hover:bg-surface" aria-label="Close"><X className="size-5" /></button>
              </div>
              <NavList items={items} onNavigate={() => setSidebar(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function MobileNavToggle() {
  const setSidebar = usePreferences((s) => s.setSidebar);
  return (
    <button className="grid size-9 place-items-center rounded-lg border border-line text-muted lg:hidden" onClick={() => setSidebar(true)} aria-label="Menu">
      <Menu className="size-5" />
    </button>
  );
}
