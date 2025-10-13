"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export function Navbar() {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    storage.init().then(() => {
      storage.getUser().then(setUser);
    });

    const { unsubscribe } = storage.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => unsubscribe();
  }, []);

  const navLinks = [
    { href: "/quest", label: t("nav.quest") },
    { href: "/quest-items", label: t("nav.questItems") },
    { href: "/hideout-items", label: t("nav.hideoutItems") },
    { href: "/quest-path", label: t("nav.questPath") },
    { href: "/obs-overlay", label: t("nav.obsOverlay") },
    { href: "/about", label: t("nav.about") },
  ];

  return (
    <nav className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-[#1b1c22] to-[#171821] border-b border-[#0d0e12] flex-wrap">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        TarkovBuddy
      </Link>

      <div className="hidden md:flex items-center gap-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
              pathname === link.href
                ? "bg-[#6B73FF] text-white"
                : "bg-[#1d1f29] border border-[#2e3246] text-[#EEE] hover:bg-[#252833]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex-1" />

      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as "en" | "no")}
        className="px-3 py-2 bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg font-bold text-sm cursor-pointer"
        aria-label="Select language"
      >
        <option value="en">English</option>
        <option value="no">Norsk</option>
      </select>

      {user ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#a8afc7]">
            {user.email || user.user_metadata?.full_name}
          </span>
          <button
            onClick={() => storage.signOut()}
            className="px-3 py-2 bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg font-bold text-sm hover:bg-[#2b2e3a] hover:border-[#4a4f63]"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="px-3 py-2 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105"
        >
          Login
        </Link>
      )}
    </nav>
  );
}
