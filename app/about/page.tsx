'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#121217] text-[#EEE]">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-[#1b1c22] to-[#171821] border-b border-[#0d0e12]">
        <h1 className="text-lg font-extrabold tracking-wide">TarkovBuddy</h1>
        <div className="flex-1" />
        <Link
          href="/"
          className="bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm hover:bg-[#2b2e3a] hover:border-[#4a4f63] transition-colors"
        >
          ← Back to home
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-br from-[#6B73FF] to-[#8B93FF] bg-clip-text text-transparent">
            TarkovBuddy
          </h1>
          <p className="text-lg text-[#a8afc7] max-w-2xl mx-auto">
            Your personal assistant for tracking Escape from Tarkov questlines, items and hideout progression
          </p>
        </div>

        <div className="bg-[#242630] border border-[#303344] rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-extrabold mb-4">About TarkovBuddy</h2>
          <p className="text-[#a8afc7] leading-relaxed mb-6">
            TarkovBuddy is a free web application designed to help Escape from Tarkov players keep track of quest progression, required items and hideout upgrades.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#171821] border border-[#303344] rounded-xl p-5">
              <h3 className="font-bold mb-2">Quest Tracking</h3>
              <p className="text-sm text-[#a8afc7] leading-snug">
                Track Kappa, Lightkeeper and BTR questlines with automatic dependency handling
              </p>
            </div>
            <div className="bg-[#171821] border border-[#303344] rounded-xl p-5">
              <h3 className="font-bold mb-2">Item Checklist</h3>
              <p className="text-sm text-[#a8afc7] leading-snug">
                Keep track of all items you need for quests and hideout
              </p>
            </div>
            <div className="bg-[#171821] border border-[#303344] rounded-xl p-5">
              <h3 className="font-bold mb-2">Cloud Sync</h3>
              <p className="text-sm text-[#a8afc7] leading-snug">
                Log in to synchronize progression across devices
              </p>
            </div>
            <div className="bg-[#171821] border border-[#303344] rounded-xl p-5">
              <h3 className="font-bold mb-2">OBS Overlay</h3>
              <p className="text-sm text-[#a8afc7] leading-snug">
                Display quest progression live in streams with OBS browser source
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-3">Technology</h3>
          <div className="flex flex-wrap gap-3">
            <span className="bg-[#171821] border border-[#303344] px-4 py-2 rounded-lg text-sm font-semibold">
              Next.js
            </span>
            <span className="bg-[#171821] border border-[#303344] px-4 py-2 rounded-lg text-sm font-semibold">
              Supabase (Auth & Database)
            </span>
            <span className="bg-[#171821] border border-[#303344] px-4 py-2 rounded-lg text-sm font-semibold">
              Tarkov.dev GraphQL API
            </span>
          </div>
        </div>

        <div className="bg-[#242630] border border-[#303344] rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-extrabold mb-4">Changelog</h2>

          <div className="space-y-6">
            <div className="border-l-[3px] border-[#6B73FF] pl-5 py-4">
              <div className="text-xs text-[#a8afc7] uppercase tracking-wider mb-2">October 2025</div>
              <div className="text-xl font-extrabold mb-2">v2.1 - Quest Items Sync Fix</div>
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[#6B73FF]/20 text-[#6B73FF] mb-3">
                Bugfix
              </span>
              <div className="text-[#a8afc7] leading-relaxed">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Fixed Quest Items synchronization:</strong> Quest Items now properly syncs with cloud storage</li>
                  <li><strong>Complete Kappa coverage:</strong> Now includes ALL Kappa-required quests</li>
                  <li><strong>Cross-page integration:</strong> Quest Items automatically hides completed items</li>
                  <li><strong>Unified storage:</strong> Both Quest and Quest Items share the same cloud/localStorage system</li>
                </ul>
              </div>
            </div>

            <div className="border-l-[3px] border-[#19c37d] pl-5 py-4">
              <div className="text-xs text-[#a8afc7] uppercase tracking-wider mb-2">October 2025</div>
              <div className="text-xl font-extrabold mb-2">v2.0 - Cloud Sync Release</div>
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[#19c37d]/20 text-[#19c37d] mb-3">
                New Feature
              </span>
              <div className="text-[#a8afc7] leading-relaxed">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Cloud synchronization:</strong> Log in with Google or Twitch to sync progression</li>
                  <li><strong>Dual storage system:</strong> Non-logged users use localStorage, logged users get cloud storage</li>
                  <li><strong>Automatic synchronization:</strong> Changes are automatically saved to cloud</li>
                  <li><strong>Supabase integration:</strong> Secure authentication and data handling</li>
                </ul>
              </div>
            </div>

            <div className="border-l-[3px] border-[#19c37d] pl-5 py-4">
              <div className="text-xs text-[#a8afc7] uppercase tracking-wider mb-2">October 2025</div>
              <div className="text-xl font-extrabold mb-2">v1.0 - Initial Release</div>
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[#19c37d]/20 text-[#19c37d] mb-3">
                Launch
              </span>
              <div className="text-[#a8afc7] leading-relaxed">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Kappa Container tracking:</strong> Track all Kappa-required quests with automatic dependency handling</li>
                  <li><strong>Lightkeeper questline:</strong> Complete overview of Lightkeeper quests</li>
                  <li><strong>BTR questline:</strong> Track BTR Driver quests</li>
                  <li><strong>Quest Items:</strong> Interactive list of all quest-related items</li>
                  <li><strong>Hideout Items:</strong> Overview of items needed for hideout upgrades</li>
                  <li><strong>OBS Overlay:</strong> Live quest progression for streamers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#242630] border border-[#303344] rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-extrabold mb-4">Planned Features</h2>
          <ul className="list-disc list-inside space-y-2 text-[#a8afc7]">
            <li>Export/import progression</li>
            <li>Dark/light mode toggle</li>
          </ul>
        </div>

        <div className="bg-[#242630] border border-[#303344] rounded-2xl p-8">
          <h2 className="text-2xl font-extrabold mb-4">Contact & Support</h2>
          <p className="text-[#a8afc7] leading-relaxed mb-4">
            TarkovBuddy is a hobby project made by players for players. Have suggestions, found a bug, or want to contribute?
          </p>
          <a
            href="https://discord.gg/g8xS66WA3p"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B73FF] hover:underline"
          >
            Discord Community
          </a>
        </div>
      </div>
    </div>
  );
}
