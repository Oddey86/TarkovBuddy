'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchAllQuests } from '@/lib/tarkovApi';
import { getQuestState, completeQuest, uncompleteQuest, subscribeToQuestState, migrateOldData } from '@/lib/questState';

interface Quest {
  id: string;
  name: string;
  trader?: { name: string };
  minPlayerLevel: number;
  kappaRequired: boolean;
  taskRequirements: Array<{ task: { id: string; name: string } }>;
}

export default function QuestPathPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [filterTrader, setFilterTrader] = useState<string>('all');
  const [showOnlyKappa, setShowOnlyKappa] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [minLevel, setMinLevel] = useState(1);

  useEffect(() => {
    migrateOldData();

    const loadData = async () => {
      try {
        const questsData = await fetchAllQuests();
        setQuests(questsData);

        const state = getQuestState();
        setCompleted(new Set(state.completedQuests));
      } catch (error) {
        console.error('Failed to load quests:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const unsubscribe = subscribeToQuestState((state) => {
      setCompleted(new Set(state.completedQuests));
    });

    return () => unsubscribe();
  }, []);

  const traders = Array.from(new Set(quests.map(q => q.trader?.name).filter(Boolean))) as string[];

  const filteredQuests = quests.filter(quest => {
    if (hideCompleted && completed.has(quest.id)) return false;
    if (showOnlyKappa && !quest.kappaRequired) return false;
    if (filterTrader !== 'all' && quest.trader?.name !== filterTrader) return false;
    if (quest.minPlayerLevel < minLevel) return false;
    return true;
  });

  const getDependencies = (questId: string): string[] => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || !quest.taskRequirements) return [];
    return quest.taskRequirements.map(req => req.task.id);
  };

  const getDependents = (questId: string): string[] => {
    return quests
      .filter(q => q.taskRequirements?.some(req => req.task.id === questId))
      .map(q => q.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6] flex items-center justify-center">
        <div className="text-xl">Loading quest dependencies...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6]">
      <header className="sticky top-0 z-10 bg-gradient-to-b from-[rgba(14,15,19,0.95)] to-[rgba(14,15,19,0.75)] backdrop-blur-md border-b border-[#24283b]">
        <div className="max-w-[1400px] mx-auto p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold tracking-wide">Quest Path Visualizer</h1>
            <div className="flex-1" />
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-[#24283b] hover:bg-[#2a2e45]"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 space-y-6">
        <Card className="p-4 bg-[#141620] border-[#24283b]">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filterTrader}
              onChange={(e) => setFilterTrader(e.target.value)}
              className="px-3 py-2 bg-[#1a1d2e] border border-[#24283b] rounded-md text-[#e8eaf6]"
            >
              <option value="all">All Traders</option>
              {traders.map(trader => (
                <option key={trader} value={trader}>{trader}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <label className="text-sm">Min Level:</label>
              <input
                type="number"
                value={minLevel}
                onChange={(e) => setMinLevel(Number(e.target.value))}
                min="1"
                max="79"
                className="w-20 px-3 py-2 bg-[#1a1d2e] border border-[#24283b] rounded-md text-[#e8eaf6]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={showOnlyKappa}
                onCheckedChange={(checked) => setShowOnlyKappa(!!checked)}
              />
              <label className="text-sm">Kappa Only</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={hideCompleted}
                onCheckedChange={(checked) => setHideCompleted(!!checked)}
              />
              <label className="text-sm">Hide Completed</label>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setFilterTrader('all');
                setShowOnlyKappa(true);
                setHideCompleted(false);
                setMinLevel(1);
              }}
              className="ml-auto"
            >
              Reset Filters
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-[#141620] border-[#24283b]">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">Quest Dependencies</h2>
            <p className="text-sm text-[#8a8fa5]">
              Showing {filteredQuests.length} quests. Click on a quest to see its requirements and unlocks.
            </p>
          </div>

          <div className="space-y-3">
            {filteredQuests.map(quest => {
              const dependencies = getDependencies(quest.id);
              const dependents = getDependents(quest.id);
              const isCompleted = completed.has(quest.id);

              return (
                <Card
                  key={quest.id}
                  className={`p-4 transition-all ${
                    isCompleted
                      ? 'bg-[#1a2820] border-[#2a4032]'
                      : 'bg-[#1a1d2e] border-[#24283b] hover:border-[#3a3f5b]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-bold text-[#e8eaf6]">{quest.name}</h3>
                          {quest.kappaRequired && (
                            <Badge className="bg-[#ffa726] text-black text-xs">KAPPA</Badge>
                          )}
                          {quest.trader && (
                            <Badge variant="outline" className="text-xs">
                              {quest.trader.name}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Level {quest.minPlayerLevel}
                          </Badge>
                          {isCompleted && (
                            <Badge className="bg-[#4caf50] text-white text-xs">COMPLETED</Badge>
                          )}
                        </div>

                        {dependencies.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-[#6b73ff] mb-1">
                              Requires:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {dependencies.map(depId => {
                                const depQuest = quests.find(q => q.id === depId);
                                const depCompleted = completed.has(depId);
                                return depQuest ? (
                                  <Badge
                                    key={depId}
                                    variant="outline"
                                    className={`text-xs ${
                                      depCompleted
                                        ? 'border-[#4caf50] text-[#4caf50]'
                                        : 'border-[#ff5252] text-[#ff5252]'
                                    }`}
                                  >
                                    {depQuest.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {dependents.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-[#8a8fa5] mb-1">
                              Unlocks:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {dependents.slice(0, 5).map(depId => {
                                const depQuest = quests.find(q => q.id === depId);
                                return depQuest ? (
                                  <Badge key={depId} variant="outline" className="text-xs">
                                    {depQuest.name}
                                  </Badge>
                                ) : null;
                              })}
                              {dependents.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{dependents.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredQuests.length === 0 && (
            <div className="text-center py-8 text-[#8a8fa5]">
              No quests found matching your filters.
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
