'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fetchAllQuests } from '@/lib/tarkovApi';
import {
  getQuestState,
  completeQuest,
  uncompleteQuest,
  subscribeToQuestState,
  migrateOldData,
  pushQuestUndoSnapshot,
} from '@/lib/questState';
import { Search, ExternalLink } from 'lucide-react';
import { UndoButton } from '@/components/UndoButton';

interface Quest {
  id: string;
  name: string;
  trader?: { name: string; imageLink?: string };
  minPlayerLevel: number;
  kappaRequired: boolean;
  objectives: Array<{ description: string }>;
  taskRequirements?: Array<{ task?: { id: string } }>;
}

const TRADER_IMAGES: Record<string, string> = {
  Prapor: 'https://assets.tarkov.dev/prapor-icon.jpg',
  Therapist: 'https://assets.tarkov.dev/therapist-icon.jpg',
  Fence: 'https://assets.tarkov.dev/fence-icon.jpg',
  Skier: 'https://assets.tarkov.dev/skier-icon.jpg',
  Peacekeeper: 'https://assets.tarkov.dev/peacekeeper-icon.jpg',
  Mechanic: 'https://assets.tarkov.dev/mechanic-icon.jpg',
  Ragman: 'https://assets.tarkov.dev/ragman-icon.jpg',
  Jaeger: 'https://assets.tarkov.dev/jaeger-icon.jpg',
  Lightkeeper: 'https://assets.tarkov.dev/lightkeeper-icon.jpg',
  Unknown: '',
};

const TRADER_ORDER = [
  'Prapor',
  'Therapist',
  'Skier',
  'Peacekeeper',
  'Mechanic',
  'Ragman',
  'Jaeger',
  'Fence',
  'Lightkeeper',
];

// Quest-grupper som hører sammen (velg én, ferdigstill alle)
const QUEST_GROUPS = [
  ["Kind of Sabotage", "Supply Plans"],
  ["Big Customer", "Chemical - Part 4", "Out of Curiosity"]
];

export default function QuestTrackerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [traderSearchTerms, setTraderSearchTerms] = useState<Record<string, string>>({});
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showKappa, setShowKappa] = useState(true);
  const [showBTR, setShowBTR] = useState(false);
  const [showLightkeeper, setShowLightkeeper] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Map for quest-grupper
  const [questGroupMap, setQuestGroupMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    migrateOldData();

    const loadData = async () => {
      try {
        const questsData = await fetchAllQuests();
        setQuests(questsData);

        const state = getQuestState();
        setCompleted(new Set(state.completedQuests));

        // Bygg quest-gruppe map
        const groupMap = new Map<string, string[]>();
        for (const group of QUEST_GROUPS) {
          const lowerGroup = group.map(q => q.toLowerCase());
          for (const questName of lowerGroup) {
            groupMap.set(questName, lowerGroup);
          }
        }
        setQuestGroupMap(groupMap);
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

  // Hent alle prerequisites (rekursivt)
  const getAllDependencies = useCallback(
    (questId: string, visited: Set<string> = new Set()): Set<string> => {
      if (visited.has(questId)) return new Set();
      visited.add(questId);

      const quest = quests.find((q) => q.id === questId);
      if (!quest || !quest.taskRequirements) return new Set();

      const allDeps = new Set<string>();
      const directDeps = quest.taskRequirements
        .filter((req) => req.task?.id)
        .map((req) => req.task!.id);

      for (const depId of directDeps) {
        allDeps.add(depId);
        const nested = getAllDependencies(depId, visited);
        nested.forEach((n) => allDeps.add(n));
      }

      return allDeps;
    },
    [quests]
  );

  // Finn quest-gruppe for et quest
  const getQuestGroup = useCallback(
    (questName: string): string[] | null => {
      return questGroupMap.get(questName.toLowerCase()) || null;
    },
    [questGroupMap]
  );

  // Finn alle quest-IDer i samme gruppe
  const getGroupTaskIds = useCallback(
    (questName: string): string[] => {
      const group = getQuestGroup(questName);
      if (!group) return [];

      const ids: string[] = [];
      for (const quest of quests) {
        if (group.includes(quest.name.toLowerCase())) {
          ids.push(quest.id);
        }
      }
      return ids;
    },
    [quests, getQuestGroup]
  );

  const toggleQuest = async (questId: string) => {
    await pushQuestUndoSnapshot();

    const currentState = getQuestState();
    const newCompleted = new Set(currentState.completedQuests);

    if (completed.has(questId)) {
      // Fjern quest
      newCompleted.delete(questId);
      await uncompleteQuest(questId);
    } else {
      // Legg til quest
      newCompleted.add(questId);

      // Ferdigstill alle prerequisites
      const allDeps = getAllDependencies(questId);
      allDeps.forEach((depId) => newCompleted.add(depId));

      // Ferdigstill alle quest i samme gruppe
      const quest = quests.find((q) => q.id === questId);
      if (quest) {
        const groupIds = getGroupTaskIds(quest.name);
        groupIds.forEach((gid) => newCompleted.add(gid));
      }

      // Lagre alle
      for (const id of newCompleted) {
        if (!currentState.completedQuests.includes(id)) {
          await completeQuest(id, []);
        }
      }
    }
  };

  const handleResetProgress = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset ALL quest progress? This will remove all completed quests. This action cannot be undone (but you can use Undo once after).'
    );
    
    if (!confirmed) return;

    await pushQuestUndoSnapshot();
    const currentState = getQuestState();
    
    // Fjern alle completed quests
    for (const questId of currentState.completedQuests) {
      await uncompleteQuest(questId);
    }
  };

  const updateTraderSearch = (trader: string, term: string) => {
    setTraderSearchTerms({ ...traderSearchTerms, [trader]: term });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6] flex items-center justify-center">
        <div className="text-xl">Loading quests...</div>
      </div>
    );
  }

  const questsByTrader = quests.reduce((acc, quest) => {
    const traderName = quest.trader?.name || 'Unknown';
    if (!acc[traderName]) acc[traderName] = [];
    acc[traderName].push(quest);
    return acc;
  }, {} as Record<string, Quest[]>);

  const traderNames = TRADER_ORDER.filter((name) => questsByTrader[name]);

  const getFilteredQuestCounts = () => {
    let totalFiltered = 0;
    let totalCompleted = 0;

    Object.values(questsByTrader).forEach((traderQuests) => {
      traderQuests.forEach((quest) => {
        const isKappaQuest = quest.kappaRequired;
        const isLightkeeperQuest = quest.trader?.name === 'Lightkeeper';

        let shouldShow = false;
        if (!showKappa && !showBTR && !showLightkeeper) {
          shouldShow = true;
        } else {
          if (showKappa && isKappaQuest) shouldShow = true;
          if (showLightkeeper && isLightkeeperQuest) shouldShow = true;
          if (showBTR && !isKappaQuest && !isLightkeeperQuest) shouldShow = true;
        }

        if (shouldShow) {
          totalFiltered++;
          if (completed.has(quest.id)) totalCompleted++;
        }
      });
    });

    return { totalFiltered, totalCompleted };
  };

  const { totalFiltered, totalCompleted } = getFilteredQuestCounts();

  const getProgressTitle = () => {
    if (showKappa && !showBTR && !showLightkeeper) return 'Kappa Progress';
    if (showBTR && !showKappa && !showLightkeeper) return 'BTR Progress';
    if (showLightkeeper && !showKappa && !showBTR) return 'Lightkeeper Progress';
    return 'Quest Progress';
  };

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6]">
      <header className="sticky top-0 z-10 bg-[#0e0f13]/95 backdrop-blur-md border-b border-[#24283b]">
        <div className="px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap mb-3">
            <h1 className="text-2xl font-bold tracking-wide">Quest Tracker</h1>

            <div className="flex gap-2">
              <Button
                variant={showKappa ? 'default' : 'outline'}
                onClick={() => setShowKappa(!showKappa)}
                size="sm"
                className={showKappa ? 'bg-[#6b73ff] hover:bg-[#5865ff]' : 'border-[#24283b] hover:bg-[#2a2e45]'}
              >
                Kappa
              </Button>
              <Button
                variant={showBTR ? 'default' : 'outline'}
                onClick={() => setShowBTR(!showBTR)}
                size="sm"
                className={showBTR ? 'bg-[#6b73ff] hover:bg-[#5865ff]' : 'border-[#24283b] hover:bg-[#2a2e45]'}
              >
                BTR
              </Button>
              <Button
                variant={showLightkeeper ? 'default' : 'outline'}
                onClick={() => setShowLightkeeper(!showLightkeeper)}
                size="sm"
                className={showLightkeeper ? 'bg-[#6b73ff] hover:bg-[#5865ff]' : 'border-[#24283b] hover:bg-[#2a2e45]'}
              >
                Lightkeeper
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setHideCompleted(!hideCompleted)}
              size="sm"
              className="border-[#24283b] hover:bg-[#2a2e45]"
            >
              {hideCompleted ? 'Show Completed' : 'Hide Completed'}
            </Button>

            <div className="flex-1" />

            <UndoButton scope="quest" />

            <Button
              onClick={handleResetProgress}
              variant="outline"
              size="sm"
              className="border-red-900/50 bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-300"
            >
              Reset Progress
            </Button>

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              size="sm"
              className="border-[#24283b] hover:bg-[#2a2e45]"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-4">
        <div className="flex gap-4 px-4 py-4 overflow-x-auto">
          {traderNames.map((traderName) => {
            const traderQuests = questsByTrader[traderName];
            const searchTerm = traderSearchTerms[traderName] || '';

            const filteredQuests = traderQuests.filter((quest) => {
              if (hideCompleted && completed.has(quest.id)) return false;
              if (searchTerm && !quest.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

              const isKappaQuest = quest.kappaRequired;
              const isLightkeeperQuest = traderName === 'Lightkeeper';

              if (!showKappa && !showBTR && !showLightkeeper) return true;

              let shouldShow = false;
              if (showKappa && isKappaQuest) shouldShow = true;
              if (showLightkeeper && isLightkeeperQuest) shouldShow = true;
              if (showBTR && !isKappaQuest && !isLightkeeperQuest) shouldShow = true;

              return shouldShow;
            });

            const completedCount = filteredQuests.filter((q) => completed.has(q.id)).length;
            const totalCount = filteredQuests.length;

            // Hent trader-bilde - prioriter hardkodede bilder
            const traderImageUrl = TRADER_IMAGES[traderName];
            const traderInitials = traderName.split(/\s+/).map(s => s[0]).join('').substring(0, 2).toUpperCase();
            const showImage = traderImageUrl && !imageErrors.has(traderName);

            const handleImageError = () => {
              setImageErrors(prev => new Set(prev).add(traderName));
            };

            return (
              <Card
                key={traderName}
                className="bg-[#1a1d2e] border-[#24283b] flex flex-col flex-shrink-0 w-[320px] h-[calc(100vh-100px)]"
              >
                <div className="p-4 border-b border-[#24283b] flex-shrink-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#24283b] flex-shrink-0 bg-[#2f3240] flex items-center justify-center relative">
                      {showImage ? (
                        <>
                          <Image
                            src={traderImageUrl}
                            alt={traderName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                            onError={() => handleImageError()}
                            onLoadingComplete={(result) => {
                              if (result.naturalWidth === 0) {
                                handleImageError();
                              }
                            }}
                          />
                        </>
                      ) : (
                        <span className="font-bold text-[#cbd2ff] text-sm">{traderInitials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-[#e8eaf6] truncate">{traderName}</h2>
                      <div className="text-xs text-[#8a8fa5]">
                        {completedCount}/{totalCount} completed
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[#8a8fa5]" />
                    <Input
                      placeholder="Search quests..."
                      value={searchTerm}
                      onChange={(e) => updateTraderSearch(traderName, e.target.value)}
                      className="pl-9 h-9 text-sm bg-[#0e0f13] border-[#24283b] text-[#e8eaf6]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {filteredQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className={`p-2.5 rounded border transition-all cursor-pointer group ${
                        completed.has(quest.id)
                          ? 'bg-[#1a2820]/50 border-[#2a4032] opacity-60'
                          : 'bg-[#0e0f13] border-[#24283b] hover:border-[#3a3e5b]'
                      }`}
                      onClick={() => toggleQuest(quest.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={completed.has(quest.id)}
                          className="mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleQuest(quest.id);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`text-sm font-medium ${
                                completed.has(quest.id) ? 'line-through text-[#8a8fa5]' : 'text-[#e8eaf6]'
                              }`}
                            >
                              {quest.name}
                            </span>
                            {quest.kappaRequired && (
                              <Badge className="text-[9px] h-4 px-1.5 bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/30">
                                KAPPA
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-[#8a8fa5]">
                            {quest.objectives.length} objective{quest.objectives.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <a
                          href={`https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(quest.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6b73ff] hover:text-[#8a9aff] opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-4 left-4 bg-[#1a1d2e]/95 backdrop-blur-md border border-[#24283b] rounded-lg px-4 py-2 shadow-lg">
        <div className="text-xs font-semibold text-[#8a8fa5] mb-1">{getProgressTitle()}</div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold text-[#e8eaf6]">
            {totalCompleted}/{totalFiltered}
          </div>
          <div className="w-32 h-2 bg-[#0e0f13] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6b73ff] to-[#8a9aff] transition-all duration-300"
              style={{ width: `${totalFiltered > 0 ? (totalCompleted / totalFiltered) * 100 : 0}%` }}
            />
          </div>
          <div className="text-xs text-[#8a8fa5]">
            {totalFiltered > 0 ? Math.round((totalCompleted / totalFiltered) * 100) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
