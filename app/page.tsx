"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";

export default function Home() {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    questCompleted: 0,
    questTotal: 0,
    questItemsCount: 0,
    hideoutItemsCount: 0,
  });

  useEffect(() => {
    const loadJSON = (key: string, fallback: any) => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
      } catch {
        return fallback;
      }
    };

    const q = loadJSON("tt_kappa_tasks_v3", {});
    const keys = Object.keys(q);
    const done = keys.filter((k) => q[k]).length;

    const qi = loadJSON("tt_quest_items_v3", {});
    const qiKeys = Object.keys(qi);

    const hi = loadJSON("tt_hideout_items_v3", {});
    const hiKeys = Object.keys(hi);

    setStats({
      questCompleted: done,
      questTotal: keys.length,
      questItemsCount: qiKeys.length,
      hideoutItemsCount: hiKeys.length,
    });
  }, []);

  return (
    <>
      <Navbar />

      <div className="max-w-[1100px] mx-auto my-8 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-[#6B73FF] to-[#8B93FF] bg-clip-text text-transparent">
          {t("home.hero.title")}
        </h1>
        <p className="text-lg text-[#a8afc7] max-w-[700px] mx-auto mb-6">
          {t("home.hero.subtitle")}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/quest"
            className="px-4 py-2.5 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105 transition-all"
          >
            {t("home.hero.startTracking")}
          </Link>
          <Link
            href="/about"
            className="px-4 py-2.5 bg-[#242630] text-white border border-[#303344] rounded-lg font-bold text-sm hover:bg-[#2b2e3a] hover:border-[#4a4f63] transition-all"
          >
            {t("home.hero.learnMore")}
          </Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <section className="bg-[#242630] border border-[#303344] rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("home.quest.title")}</h2>
          <p className="text-sm text-[#a8afc7] leading-relaxed">
            {t("home.quest.desc")}
          </p>
          <div className="flex gap-3 items-center">
            <Link
              href="/quest"
              className="px-4 py-2.5 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105 transition-all"
            >
              {t("home.quest.btn")}
            </Link>
            <div className="text-xs text-[#a8afc7]">
              {stats.questTotal > 0
                ? `${t("home.stats.completed")} ${stats.questCompleted}/${stats.questTotal}`
                : t("home.stats.noProgress")}
            </div>
          </div>
        </section>

        <section className="bg-[#242630] border border-[#303344] rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("home.questItems.title")}</h2>
          <p className="text-sm text-[#a8afc7] leading-relaxed">
            Expandable panels per quest with +/− counting for each item requirement. Completed quests auto-hide to keep your list clean.
          </p>
          <div className="flex gap-3 items-center">
            <Link
              href="/quest-items"
              className="px-4 py-2.5 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105 transition-all"
            >
              {t("home.questItems.btn")}
            </Link>
            <div className="text-xs text-[#a8afc7]">
              {stats.questItemsCount > 0
                ? `${t("home.stats.tracked")} ${stats.questItemsCount}`
                : t("home.stats.noProgress")}
            </div>
          </div>
        </section>

        <section className="bg-[#242630] border border-[#303344] rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("home.hideout.title")}</h2>
          <p className="text-sm text-[#a8afc7] leading-relaxed">
            Select station and level to track required items with +/− counting. Completed levels automatically hide.
          </p>
          <div className="flex gap-3 items-center">
            <Link
              href="/hideout-items"
              className="px-4 py-2.5 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105 transition-all"
            >
              {t("home.hideout.btn")}
            </Link>
            <div className="text-xs text-[#a8afc7]">
              {stats.hideoutItemsCount > 0
                ? `${t("home.stats.tracked")} ${stats.hideoutItemsCount}`
                : t("home.stats.noProgress")}
            </div>
          </div>
        </section>

        <section className="bg-[#242630] border border-[#303344] rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("home.questPath.title")}</h2>
          <p className="text-sm text-[#a8afc7] leading-relaxed">
            Interactive visual diagram showing all Kappa quest dependencies. Filter by trader, level, and completion status.
          </p>
          <div className="flex gap-3 items-center">
            <Link
              href="/quest-path"
              className="px-4 py-2.5 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105 transition-all"
            >
              {t("home.questPath.btn")}
            </Link>
          </div>
        </section>

        <section className="bg-[#242630] border border-[#303344] rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-lg font-bold">Quest Path Optimizer</h2>
          <p className="text-sm text-[#a8afc7] leading-relaxed">
            AI-powered route optimization to minimize map switches. Configure penalties, focus targets, and inventory to get the most efficient quest path.
          </p>
          <div className="flex gap-3 items-center">
            <Link
              href="/optimizer"
              className="px-4 py-2.5 bg-[#6B73FF] text-white rounded-lg font-bold text-sm hover:brightness-105 transition-all"
            >
              Optimize Route
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
