"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="max-w-[1100px] mx-auto my-10 px-4 text-[#a8afc7] flex justify-between gap-3 flex-wrap text-xs">
      <div>
        Progress saved locally in browser (localStorage). Cloud sync available
        with login.
      </div>
      <div>
        © 2025 Knivet •{" "}
        <Link href="/about" className="text-[#6B73FF] no-underline">
          About & Changes
        </Link>{" "}
        •{" "}
        <a
          href="https://discord.gg/g8xS66WA3p"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6B73FF] no-underline"
        >
          Discord
        </a>
      </div>
    </footer>
  );
}
