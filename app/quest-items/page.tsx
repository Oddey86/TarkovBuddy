'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAllQuests } from '@/lib/tarkovApi';
import { getQuestState, subscribeToQuestState, updateQuestItemCount, migrateOldData } from '@/lib/questState';
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';

interface QuestItem {
  id: string;
  name: string;
  iconLink?: string;
  count: number;
  foundInRaid: boolean;
}

interface Quest {
  id: string;
  name: string;
  trader?: { name: string };
  objectives: Array<{
    type: string;
    description: string;
    item?: QuestItem;
    items?: QuestItem[];
    count?: number;
  }>;
}

const TRADER_ORDER = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaeger', 'Fence', 'Lightkeeper'];

export default function QuestItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());

  useEffect(() => {
    migrateOldData();

    const loadData = async () => {
      try {
        const questsData = await fetchAllQuests();
        const questsWithFIRItems = questsData.filter((q: Quest) =>
          q.objectives.some(obj => {
            const items = obj.items || (obj.item ? [obj.item] : []);
            return items.some(item => item.foundInRaid);
          })
        );
        setQuests(questsWithFIRItems);

        const state = getQuestState();
        setItemCounts(state.questItemCounts);
        setCompletedQuests(new Set(state.completedQuests));
      } catch (error) {
        console.error('Failed to load quests:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const unsubscribe = subscribeToQuestState((state) => {
      setItemCounts(state.questItemCounts);
      setCompletedQuests(new Set(state.completedQuests));
    });

    return () => unsubscribe();
  }, []);

  const updateCount = (key: string, delta: number) => {
    const newCount = Math.max(0, (itemCounts[key] || 0) + delta);
    updateQuestItemCount(key, newCount);
  };

  const getItemKey = (questId: string, itemId: string) => `${questId}:${itemId}`;

  const toggleQuestExpanded = (questId: string) => {
    const newExpanded = new Set(expandedQuests);
    if (newExpanded.has(questId)) {
      newExpanded.delete(questId);
    } else {
      newExpanded.add(questId);
    }
    setExpandedQuests(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6] flex items-center justify-center">
        <div className="text-xl">Loading quest items...</div>
      </div>
    );
  }

  const questsByTrader = quests
    .filter(q => !completedQuests.has(q.id))
    .reduce((acc, quest) => {
      const traderName = quest.trader?.name || 'Unknown';
      if (!acc[traderName]) {
        acc[traderName] = [];
      }
      acc[traderName].push(quest);
      return acc;
    }, {} as Record<string, Quest[]>);

  const traderNames = TRADER_ORDER.filter(name => questsByTrader[name]);

  const getQuestProgress = (quest: Quest) => {
    const firItems = quest.objectives.flatMap(obj => {
      const items = obj.items || (obj.item ? [obj.item] : []);
      return items.filter(item => item.foundInRaid);
    });

    let collected = 0;
    let total = 0;

    firItems.forEach(item => {
      const key = getItemKey(quest.id, item.id);
      const current = itemCounts[key] || 0;
      const needed = item.count || 1;
      total++;
      if (current >= needed) collected++;
    });

    return { collected, total };
  };

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6]">
      <header className="sticky top-0 z-20 bg-[#0e0f13]/95 backdrop-blur-md border-b border-[#24283b]">
        <div className="max-w-[2000px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold tracking-wide">Quest Items Tracker</h1>
            <div className="flex-1" />
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-[#24283b] hover:bg-[#2a2e45] text-sm"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-4">
        <div className="flex gap-4 px-4 py-4 overflow-x-auto">
          {traderNames.map(traderName => {
            const traderQuests = questsByTrader[traderName];

            return (
              <Card key={traderName} className="bg-[#1a1d2e] border-[#24283b] flex flex-col flex-shrink-0 w-[320px] h-[calc(100vh-100px)]">
                <div className="p-4 border-b border-[#24283b]">
                  <h2 className="text-lg font-bold text-[#e8eaf6]">{traderName}</h2>
                  <div className="text-xs text-[#8a8fa5] mt-1">
                    {traderQuests.length} quests with FIR items
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {traderQuests.map(quest => {
                    const { collected, total } = getQuestProgress(quest);
                    const isExpanded = expandedQuests.has(quest.id);
                    const firItems = quest.objectives.flatMap(obj => {
                      const items = obj.items || (obj.item ? [obj.item] : []);
                      return items.filter(item => item.foundInRaid);
                    });

                    return (
                      <div key={quest.id} className="bg-[#0e0f13] border border-[#24283b] rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleQuestExpanded(quest.id)}
                          className="w-full p-3 flex items-center gap-2 hover:bg-[#1a1d2e] transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#8a8fa5] flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#8a8fa5] flex-shrink-0" />
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-sm text-[#e8eaf6]">{quest.name}</div>
                            <div className="text-xs text-[#8a8fa5] mt-0.5">
                              {collected}/{total} collected
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-[#24283b] p-2 space-y-2">
                            {firItems.map(item => {
                              const itemKey = getItemKey(quest.id, item.id);
                              const currentCount = itemCounts[itemKey] || 0;
                              const required = item.count || 1;
                              const isComplete = currentCount >= required;

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-2 p-2 rounded transition-all ${
                                    isComplete
                                      ? 'bg-[#1a2820]/50 border border-[#2a4032]'
                                      : 'bg-[#141620] border border-[#24283b]'
                                  }`}
                                >
                                  {item.iconLink && (
                                    <img
                                      src={item.iconLink}
                                      alt={item.name}
                                      className="w-10 h-10 object-contain flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-[#e8eaf6] truncate">
                                      {item.name}
                                    </div>
                                    <div className="text-xs text-[#8a8fa5]">
                                      {currentCount}/{required}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => updateCount(itemKey, -1)}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-[#0e0f13] hover:bg-[#2a2e45] text-[#e8eaf6]"
                                      disabled={currentCount === 0}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => updateCount(itemKey, 1)}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-[#0e0f13] hover:bg-[#2a2e45] text-[#e8eaf6]"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
