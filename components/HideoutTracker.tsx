'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadHideoutStations,
  keyFor,
  levelKey,
  isCurrency,
  type HideoutStation,
  type HideoutLevel,
  type ItemRequirement,
} from '@/lib/tarkovHideout';
import {
  getQuestState,
  subscribeToQuestState,
  updateHideoutItemCount,
  toggleHideoutLevelSelection,
  setAllHideoutLevelsSelected,
  toggleHideoutLevelCompleted,
  migrateOldData
} from '@/lib/questState';

const STORAGE = {
  ITEMS: "tt_hideout_items_v3",
  SELECTED_LEVELS: "tt_hideout_selected_levels_v1",
  COMPLETED_LEVELS: "hideout_completed_levels"
};

type ItemCounts = Record<string, number>;
type LevelSelections = Record<string, boolean>;

interface ItemSummary {
  item: { id: string; name: string; iconLink?: string };
  totalNeeded: number;
  totalCollected: number;
  stations: string[];
  stationKeys: string[];
}

export default function HideoutTracker() {
  const [stations, setStations] = useState<HideoutStation[]>([]);
  const [itemCounts, setItemCounts] = useState<ItemCounts>({});
  const [selectedLevels, setSelectedLevels] = useState<LevelSelections>({});
  const [completedLevels, setCompletedLevels] = useState<LevelSelections>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [currentSort, setCurrentSort] = useState('progress');
  const [summarySearch, setSummarySearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    migrateOldData();
    loadFromStorage();
    loadData();

    const unsubscribe = subscribeToQuestState((state) => {
      setItemCounts(state.hideoutItemCounts);
      setSelectedLevels(state.hideoutSelectedLevels);
      setCompletedLevels(state.hideoutCompletedLevels);
    });

    return () => unsubscribe();
  }, []);

  const loadFromStorage = () => {
    const state = getQuestState();
    setItemCounts(state.hideoutItemCounts);
    setSelectedLevels(state.hideoutSelectedLevels);
    setCompletedLevels(state.hideoutCompletedLevels);
  };

  const saveItemCounts = (counts: ItemCounts) => {
    setItemCounts(counts);
  };

  const saveSelectedLevels = (levels: LevelSelections) => {
    setSelectedLevels(levels);
  };

  const saveCompletedLevels = (levels: LevelSelections) => {
    setCompletedLevels(levels);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await loadHideoutStations();
      setStations(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load hideout data');
      setLoading(false);
    }
  };

  const updateCount = (key: string, delta: number) => {
    const current = Number(itemCounts[key] || 0);
    const newValue = Math.max(0, current + delta);
    updateHideoutItemCount(key, newValue);
  };

  const handleToggleLevelSelection = (stationId: string, level: number) => {
    const key = levelKey(stationId, level);
    toggleHideoutLevelSelection(key);
  };

  const selectAll = () => {
    const allLevels: string[] = [];
    for (const station of stations) {
      for (const level of station.levels || []) {
        if (level.itemRequirements && level.itemRequirements.length > 0) {
          allLevels.push(levelKey(station.id, level.level));
        }
      }
    }
    setAllHideoutLevelsSelected(true, allLevels);
  };

  const selectNone = () => {
    const allLevels: string[] = [];
    for (const station of stations) {
      for (const level of station.levels || []) {
        if (level.itemRequirements && level.itemRequirements.length > 0) {
          allLevels.push(levelKey(station.id, level.level));
        }
      }
    }
    setAllHideoutLevelsSelected(false, allLevels);
  };

  const selectCurrentPlus1 = () => {
    const levelsToSelect: string[] = [];
    for (const station of stations) {
      const currentLevel = getCurrentLevel(station.id);
      const sortedLevels = (station.levels || []).sort((a, b) => a.level - b.level);
      const nextLevel = sortedLevels.find((l) => l.level > currentLevel);
      if (nextLevel && nextLevel.itemRequirements && nextLevel.itemRequirements.length > 0) {
        levelsToSelect.push(levelKey(station.id, nextLevel.level));
      }
    }
    setAllHideoutLevelsSelected(true, levelsToSelect);
  };

  const selectMaxLevel = () => {
    const levelsToSelect: string[] = [];
    for (const station of stations) {
      const maxLevel = Math.max(...station.levels.map((l) => l.level));
      const maxLevelData = station.levels.find((l) => l.level === maxLevel);
      if (maxLevelData && maxLevelData.itemRequirements && maxLevelData.itemRequirements.length > 0) {
        levelsToSelect.push(levelKey(station.id, maxLevel));
      }
    }
    setAllHideoutLevelsSelected(true, levelsToSelect);
  };

  const getCurrentLevel = (stationId: string) => {
    const station = stations.find((s) => s.id === stationId);
    if (!station) return 0;
    const sortedLevels = (station.levels || []).sort((a, b) => a.level - b.level);
    let highestCompleted = 0;
    for (const level of sortedLevels) {
      if (completedLevels[levelKey(stationId, level.level)]) {
        highestCompleted = level.level;
      }
    }
    return highestCompleted;
  };

  const resetProgress = () => {
    if (confirm("Er du sikker på at du vil tilbakestille all hideout progress?")) {
      saveItemCounts({});
      saveSelectedLevels({});
      saveCompletedLevels({});
    }
  };

  const getSummaryData = () => {
    const stationItemSummary = new Map<string, ItemSummary[]>();

    for (const station of stations) {
      const itemMap = new Map<string, ItemSummary>();
      const levelsWithItems = (station.levels || []).filter(
        (level) => level.itemRequirements && level.itemRequirements.length > 0
      );

      for (const level of levelsWithItems) {
        const isSelected = selectedLevels[levelKey(station.id, level.level)];
        if (!isSelected) continue;

        for (const itemReq of level.itemRequirements) {
          const item = itemReq.item;
          if (!item || !item.id || isCurrency(item.name)) continue;

          const itemId = item.id;
          if (!itemMap.has(itemId)) {
            itemMap.set(itemId, {
              item: item,
              totalNeeded: 0,
              totalCollected: 0,
              stations: [],
              stationKeys: [],
            });
          }

          const summary = itemMap.get(itemId)!;
          const key = keyFor(station.id, level.level, item.id);
          const have = Number(itemCounts[key] ?? 0);
          const need = Number(itemReq.count || 1);
          summary.totalNeeded += need;
          summary.totalCollected += Math.min(have, need);
          summary.stations.push(`${station.name} L${level.level}`);
          summary.stationKeys.push(key);
        }
      }

      if (itemMap.size > 0) {
        stationItemSummary.set(station.name, Array.from(itemMap.values()));
      }
    }

    return stationItemSummary;
  };

  const filteredStations = stations.filter((station) => {
    const levelsWithItems = (station.levels || []).filter(
      (level) => level.itemRequirements && level.itemRequirements.length > 0
    );
    return levelsWithItems.length > 0;
  });

  const totals = (() => {
    let totalItems = 0, collectedItems = 0, selectedLevelCount = 0;
    for (const station of stations) {
      const levelsWithItems = (station.levels || []).filter(
        (level) => level.itemRequirements && level.itemRequirements.length > 0
      );
      for (const level of levelsWithItems) {
        const isSelected = selectedLevels[levelKey(station.id, level.level)];
        if (isSelected) {
          selectedLevelCount++;
          totalItems += level.itemRequirements.length;
          for (const itemReq of level.itemRequirements) {
            const key = keyFor(station.id, level.level, itemReq.item.id);
            const have = Number(itemCounts[key] ?? 0);
            const need = Number(itemReq.count || 1);
            if (have >= need) collectedItems++;
          }
        }
      }
    }
    return { totalItems, collectedItems, selectedLevelCount };
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121217] text-[#EEE]">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-[#1b1c22] to-[#171821] border-b border-[#0d0e12] flex-wrap">
          <h1 className="text-lg font-extrabold tracking-wide">TarkovBuddy</h1>
        </header>
        <div className="flex gap-4 p-4 overflow-x-auto">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80 h-[340px] rounded-2xl bg-gradient-to-r from-[#252833] via-[#2b2f3d] to-[#252833] bg-[length:400%_100%] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121217] text-[#EEE] p-4">
        <div className="bg-[#3a1e1e] border border-[#7a3b3b] text-[#ffdede] p-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const summaryData = getSummaryData();

  return (
    <div className="min-h-screen bg-[#121217] text-[#EEE]">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-[#1b1c22] to-[#171821] border-b border-[#0d0e12] flex-wrap">
        <h1 className="text-lg font-extrabold tracking-wide">TarkovBuddy</h1>

        <select
          className="bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#2b2e3a]"
          value="hideout-items"
          onChange={(e) => router.push(`/${e.target.value}`)}
        >
          <option value="quest">Quest (Kappa)</option>
          <option value="hideout-items">Hideout Items</option>
        </select>

        <div className="flex-1" />

        <button
          onClick={loadData}
          className="bg-[#6B73FF] text-white border-0 rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:brightness-105"
        >
          Refresh Data
        </button>
        <button
          onClick={resetProgress}
          className="bg-[#3b2225] text-[#EEE] border border-[#5a2e34] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#4b2a2f]"
        >
          Reset Progress
        </button>
        <button
          onClick={() => router.push('/')}
          className="bg-transparent text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#2b2e3a]"
        >
          Exit
        </button>
      </header>

      <div className="bg-[#171821] border border-[#303344] rounded-lg p-3 m-4">
        <h4 className="m-0 mb-2.5 text-[#EEE]">Velg hvilke oppgraderinger å samle items til:</h4>
        <div className="flex gap-2 flex-wrap">
          <button onClick={selectAll} className="bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#2b2e3a]">
            Velg Alle
          </button>
          <button onClick={selectNone} className="bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#2b2e3a]">
            Fjern Alle
          </button>
          <button onClick={selectCurrentPlus1} className="bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#2b2e3a]">
            Neste Level for alle stations
          </button>
          <button onClick={selectMaxLevel} className="bg-[#242630] text-[#EEE] border border-[#303344] rounded-lg px-3 py-2 font-bold text-sm cursor-pointer hover:bg-[#2b2e3a]">
            Max Level for alle stations
          </button>
        </div>
      </div>

      <main className="flex gap-4 p-4 overflow-x-auto snap-x snap-mandatory">
        {filteredStations.map((station) => {
          const levelsWithItems = (station.levels || []).filter(
            (level) => level.itemRequirements && level.itemRequirements.length > 0
          );

          let stationCollected = 0;
          let stationTotal = 0;

          for (const level of levelsWithItems) {
            const isSelected = selectedLevels[levelKey(station.id, level.level)];
            if (isSelected) {
              for (const itemReq of level.itemRequirements) {
                if (isCurrency(itemReq.item.name)) continue;
                const key = keyFor(station.id, level.level, itemReq.item.id);
                const have = Number(itemCounts[key] ?? 0);
                const need = Number(itemReq.count || 1);
                stationTotal++;
                if (have >= need) stationCollected++;
              }
            }
          }

          return (
            <StationCard
              key={station.id}
              station={station}
              levelsWithItems={levelsWithItems}
              itemCounts={itemCounts}
              selectedLevels={selectedLevels}
              onToggleLevel={handleToggleLevelSelection}
              onUpdateCount={updateCount}
              stationCollected={stationCollected}
              stationTotal={stationTotal}
            />
          );
        })}
      </main>

      <SummarySection
        summaryData={summaryData}
        itemCounts={itemCounts}
        currentFilter={currentFilter}
        currentSort={currentSort}
        summarySearch={summarySearch}
        onFilterChange={setCurrentFilter}
        onSortChange={setCurrentSort}
        onSearchChange={setSummarySearch}
        onUpdateCount={updateCount}
      />

      <footer className="sticky bottom-0 z-20 bg-gradient-to-t from-[#1b1c22] to-[#171821] border-t border-[#0d0e12] p-2.5 px-4 flex gap-2.5 items-center flex-wrap">
        <div className="bg-[#1d1f29] border border-[#2e3246] px-3 py-1.5 rounded-full text-sm">
          Valgte Levels: <b>{totals.selectedLevelCount}</b>
        </div>
        <div className="bg-[#1d1f29] border border-[#2e3246] px-3 py-1.5 rounded-full text-sm">
          Total Items: <b>{totals.totalItems}</b>
        </div>
        <div className="bg-[#1d1f29] border border-[#2e3246] px-3 py-1.5 rounded-full text-sm">
          Samlet: <b>{totals.collectedItems}</b>
        </div>
        <div className="bg-[#19c37d] border-0 text-white px-3 py-1.5 rounded-full text-sm">
          Progress: <b>{totals.totalItems ? ((totals.collectedItems / totals.totalItems) * 100).toFixed(1) : 0}%</b>
        </div>
        <div className="flex-1" />
        <div className="text-xs text-[#a8afc7]">Progress lagres automatisk</div>
      </footer>
    </div>
  );
}

function StationCard({
  station,
  levelsWithItems,
  itemCounts,
  selectedLevels,
  onToggleLevel,
  onUpdateCount,
  stationCollected,
  stationTotal,
}: {
  station: HideoutStation;
  levelsWithItems: HideoutLevel[];
  itemCounts: ItemCounts;
  selectedLevels: LevelSelections;
  onToggleLevel: (stationId: string, level: number) => void;
  onUpdateCount: (key: string, delta: number) => void;
  stationCollected: number;
  stationTotal: number;
}) {
  const [search, setSearch] = useState('');

  const filteredLevels = levelsWithItems.filter((level) =>
    `Level ${level.level}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-shrink-0 w-80 snap-start bg-[#242630] border border-[#303344] rounded-2xl p-3 flex flex-col h-[calc(100vh-180px)]">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-full bg-[#2f3240] flex items-center justify-center font-extrabold text-[#cbd2ff] border border-[#444960] flex-shrink-0">
          {station.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="font-extrabold">{station.name}</div>
        <div className="ml-auto text-xs text-[#a8afc7]">
          {stationCollected}/{stationTotal} collected
        </div>
      </div>

      <div className="mb-2.5">
        <input
          type="text"
          placeholder="Søk levels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2.5 rounded-lg border border-[#2e3246] bg-[#1d1f29] text-[#EEE] text-sm"
        />
      </div>

      <div className="overflow-y-auto flex-1 pr-1">
        {filteredLevels.map((level) => (
          <LevelPill
            key={level.level}
            stationId={station.id}
            level={level}
            itemCounts={itemCounts}
            isSelected={selectedLevels[levelKey(station.id, level.level)] || false}
            onToggle={() => onToggleLevel(station.id, level.level)}
            onUpdateCount={onUpdateCount}
          />
        ))}
      </div>
    </div>
  );
}

function LevelPill({
  stationId,
  level,
  itemCounts,
  isSelected,
  onToggle,
  onUpdateCount,
}: {
  stationId: string;
  level: HideoutLevel;
  itemCounts: ItemCounts;
  isSelected: boolean;
  onToggle: () => void;
  onUpdateCount: (key: string, delta: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const nonCurrencyItems = level.itemRequirements.filter((req) => !isCurrency(req.item.name));

  return (
    <div className={`rounded-lg my-1.5 overflow-hidden ${isSelected ? 'bg-[#2d4a3a] border-2 border-[#4a7c59]' : 'bg-[#2c2f3a]'}`}>
      <div
        className="flex items-center justify-between p-2.5 cursor-pointer hover:brightness-110"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-bold text-sm">Level {level.level}</span>
        <span className="text-xs bg-[#373a4a] px-2 py-1 rounded">{nonCurrencyItems.length} items</span>
        <label className="flex items-center gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={onToggle} />
          <span className="text-xs">Samle</span>
        </label>
      </div>

      {expanded && (
        <div className="p-2 pt-0">
          {nonCurrencyItems.map((itemReq) => {
            const key = keyFor(stationId, level.level, itemReq.item.id);
            const have = Number(itemCounts[key] ?? 0);
            const need = Number(itemReq.count || 1);
            const done = have >= need;

            return (
              <div key={itemReq.item.id} className="flex items-center gap-2.5 bg-[#1d1f29] rounded p-2 mb-1.5">
                <img
                  src={itemReq.item.iconLink || ''}
                  alt={itemReq.item.name}
                  className="w-10 h-10 object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{itemReq.item.name}</div>
                  <div className="text-xs text-[#a8afc7]">Trengs: {need}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="w-7 h-7 bg-[#373a4a] rounded text-lg leading-none hover:bg-[#444960]"
                    onClick={() => onUpdateCount(key, -1)}
                  >
                    −
                  </button>
                  <div className={`text-sm font-bold px-2 ${done ? 'text-[#19c37d]' : ''}`}>
                    {have}/{need}
                  </div>
                  <button
                    className="w-7 h-7 bg-[#373a4a] rounded text-lg leading-none hover:bg-[#444960]"
                    onClick={() => onUpdateCount(key, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummarySection({
  summaryData,
  itemCounts,
  currentFilter,
  currentSort,
  summarySearch,
  onFilterChange,
  onSortChange,
  onSearchChange,
  onUpdateCount,
}: {
  summaryData: Map<string, ItemSummary[]>;
  itemCounts: ItemCounts;
  currentFilter: string;
  currentSort: string;
  summarySearch: string;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (search: string) => void;
  onUpdateCount: (key: string, delta: number) => void;
}) {
  const updateSummaryCount = (keys: string[], delta: number) => {
    for (const key of keys) {
      onUpdateCount(key, delta);
    }
  };

  const sortedStations = Array.from(summaryData.keys()).sort();

  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold">📦 Item Summary</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#a8afc7]">Filter:</span>
          {['all', 'missing', 'partial', 'complete'].map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                currentFilter === filter ? 'bg-[#6B73FF] text-white' : 'bg-[#242630] text-[#EEE] hover:bg-[#2b2e3a]'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
          <span className="text-sm text-[#a8afc7] ml-2">Sort:</span>
          {['progress', 'name'].map((sort) => (
            <button
              key={sort}
              onClick={() => onSortChange(sort)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                currentSort === sort ? 'bg-[#6B73FF] text-white' : 'bg-[#242630] text-[#EEE] hover:bg-[#2b2e3a]'
              }`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        placeholder="Search for items..."
        value={summarySearch}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full p-2.5 rounded-lg border border-[#2e3246] bg-[#1d1f29] text-[#EEE] text-sm mb-4"
      />

      <div className="space-y-4">
        {sortedStations.map((stationName) => {
          let items = summaryData.get(stationName) || [];

          items = items.filter((item) => {
            const matchesSearch = item.item.name.toLowerCase().includes(summarySearch.toLowerCase());
            const isComplete = item.totalCollected >= item.totalNeeded;
            const isPartial = item.totalCollected > 0 && item.totalCollected < item.totalNeeded;
            const isMissing = item.totalCollected === 0;

            const matchesFilter =
              currentFilter === 'all' ||
              (currentFilter === 'complete' && isComplete) ||
              (currentFilter === 'partial' && isPartial) ||
              (currentFilter === 'missing' && isMissing);

            return matchesSearch && matchesFilter;
          });

          if (currentSort === 'progress') {
            items.sort((a, b) => {
              const aProgress = a.totalCollected / a.totalNeeded;
              const bProgress = b.totalCollected / b.totalNeeded;
              if (aProgress !== bProgress) return bProgress - aProgress;
              const aRemaining = a.totalNeeded - a.totalCollected;
              const bRemaining = b.totalNeeded - b.totalCollected;
              if (aRemaining !== bRemaining) return aRemaining - bRemaining;
              return a.item.name.localeCompare(b.item.name);
            });
          } else {
            items.sort((a, b) => a.item.name.localeCompare(b.item.name));
          }

          if (items.length === 0) return null;

          const stationTotal = items.reduce((sum, item) => sum + item.totalNeeded, 0);
          const stationCollected = items.reduce((sum, item) => sum + item.totalCollected, 0);

          return (
            <div key={stationName} className="bg-[#242630] border border-[#303344] rounded-lg p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#2f3240] flex items-center justify-center font-extrabold text-[#cbd2ff] border border-[#444960]">
                  {stationName.slice(0, 2).toUpperCase()}
                </div>
                <div className="font-extrabold">{stationName}</div>
                <div className="ml-auto text-sm text-[#a8afc7]">
                  {stationCollected}/{stationTotal}
                </div>
              </div>

              <div className="space-y-2">
                {items.map((itemData) => {
                  const isComplete = itemData.totalCollected >= itemData.totalNeeded;
                  const isPartial = itemData.totalCollected > 0 && itemData.totalCollected < itemData.totalNeeded;

                  return (
                    <div
                      key={itemData.item.id}
                      className={`flex items-center gap-3 bg-[#2c2f3a] rounded-lg p-2.5 ${isComplete ? 'opacity-60' : ''}`}
                    >
                      <img
                        src={itemData.item.iconLink || ''}
                        alt={itemData.item.name}
                        className="w-10 h-10 object-contain"
                        onError={(e) => (e.currentTarget.style.opacity = '0.3')}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{itemData.item.name}</div>
                        <div className="text-xs text-[#a8afc7]" title={itemData.stations.join('\n')}>
                          {itemData.stations.length > 1
                            ? `${itemData.stations[0]} +${itemData.stations.length - 1}`
                            : itemData.stations[0]}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm font-bold ${
                            isComplete ? 'text-[#19c37d]' : isPartial ? 'text-[#f5a524]' : 'text-[#ef4444]'
                          }`}
                        >
                          {itemData.totalCollected}/{itemData.totalNeeded}
                        </div>
                        <button
                          className="w-7 h-7 bg-[#373a4a] rounded text-lg leading-none hover:bg-[#444960]"
                          onClick={() => updateSummaryCount(itemData.stationKeys, -1)}
                        >
                          −
                        </button>
                        <button
                          className="w-7 h-7 bg-[#373a4a] rounded text-lg leading-none hover:bg-[#444960]"
                          onClick={() => updateSummaryCount(itemData.stationKeys, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
