'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchAllQuests } from '@/lib/tarkovApi';
import {
  optimize,
  type Task,
  type OptimizationWeights,
  type OptimizationFlags,
  type Inventory,
  type OptimizationResult,
  type SweepStep,
  getMapEmoji
} from '@/lib/tarkovOptimizer';
import { getQuestState, subscribeToQuestState, toggleQuestObjective, migrateOldData } from '@/lib/questState';
import { ChevronDown, ChevronRight, ExternalLink, Edit2 } from 'lucide-react';

const ALL_MAPS = ['Factory', 'Customs', 'Woods', 'Shoreline', 'Interchange', 'Reserve', 'Labs', 'Lighthouse', 'Streets', 'Ground Zero'];

export default function OptimizerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [playerLevel, setPlayerLevel] = useState(42);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [completedObjectives, setCompletedObjectives] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputLevel, setInputLevel] = useState('42');

  const [kappaFocus, setKappaFocus] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    migrateOldData();

    const loadData = async () => {
      try {
        const questsData = await fetchAllQuests();
        const mappedTasks: Task[] = questsData.map((q: any) => ({
          id: q.id,
          name: q.name,
          trader: q.trader?.name,
          minPlayerLevel: q.minPlayerLevel || 1,
          kappaRequired: q.kappaRequired || false,
          requires: (q.taskRequirements || [])
            .filter((r: any) => r.task?.id)
            .map((r: any) => r.task.id),
          objectives: (q.objectives || []).map((obj: any) => ({
            id: obj.id,
            description: obj.description || '',
            maps: obj.maps?.map((m: any) => m.name) || [],
          })),
          neededKeys: q.neededKeys?.map((k: any) => k.name) || [],
        }));

        setTasks(mappedTasks);

        const state = getQuestState();
        setCompleted(new Set(state.completedQuests));
        setCompletedObjectives(new Set(state.completedObjectives));
        setPlayerLevel(state.playerLevel || 42);
        setInputLevel((state.playerLevel || 42).toString());
      } catch (error) {
        console.error('Failed to load quests:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const unsubscribe = subscribeToQuestState((state) => {
      setCompleted(new Set(state.completedQuests));
      setCompletedObjectives(new Set(state.completedObjectives));
      setPlayerLevel(state.playerLevel || 42);
      setInputLevel((state.playerLevel || 42).toString());
    });

    return () => unsubscribe();
  }, []);

  const handleRecalculate = () => {
    const weights: OptimizationWeights = {
      mapSwitchPenalty: 100,
      missingKeyPenalty: 50,
      missingItemPenalty: 30,
    };

    const flags: OptimizationFlags = {
      kappaFocus,
      ignoreMissingKeys: false,
    };

    const inv: Inventory = { keys: [], items: [] };

    const optimizationResult = optimize(
      tasks,
      playerLevel,
      completed,
      weights,
      flags,
      new Set(),
      new Set(ALL_MAPS),
      inv,
      completedObjectives
    );

    setResult(optimizationResult);
  };

  const handleLevelSave = () => {
    const newLevel = parseInt(inputLevel);
    if (!isNaN(newLevel) && newLevel >= 1 && newLevel <= 79) {
      setPlayerLevel(newLevel);
    }
    setIsEditing(false);
  };

  const handleToggleObjective = (taskId: string, objectiveId: string) => {
    toggleQuestObjective(taskId, objectiveId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6] flex items-center justify-center">
        <div className="text-xl">Loading quest data...</div>
      </div>
    );
  }

  const availableCount = tasks.filter(t =>
    !completed.has(t.id) &&
    t.minPlayerLevel <= playerLevel &&
    t.requires.every(reqId => completed.has(reqId))
  ).length;

  const completedCount = completed.size;

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaf6]">
      <header className="sticky top-0 z-10 bg-[#0e0f13]/95 backdrop-blur-md border-b border-[#24283b] px-4 py-3">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-sm text-[#8a8fa5] mb-2">
            Tasks loaded: {tasks.length} | {completedCount} completed
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 bg-[#1a1d2e] border border-[#fbbf24] rounded-lg px-4 py-2">
              <span className="font-semibold text-[#fbbf24]">Player Level:</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inputLevel}
                    onChange={(e) => setInputLevel(e.target.value)}
                    className="w-16 px-2 py-1 bg-[#0e0f13] border border-[#24283b] rounded text-[#e8eaf6]"
                    min="1"
                    max="79"
                  />
                  <button
                    onClick={handleLevelSave}
                    className="text-[#fbbf24] hover:text-[#fcd34d]"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#fbbf24]">{playerLevel}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[#8a8fa5] hover:text-[#e8eaf6]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#1a1d2e] border border-[#24283b] rounded-lg px-4 py-2">
              <Checkbox
                checked={kappaFocus}
                onCheckedChange={(checked) => setKappaFocus(!!checked)}
              />
              <span className="text-sm">Prioritize Kappa-related</span>
            </div>

            <Button
              onClick={handleRecalculate}
              className="bg-[#6b73ff] hover:bg-[#5865ff] text-white font-semibold"
            >
              Recalculate Route
            </Button>

            <span className="text-sm text-[#4ade80]">Ready</span>

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

      <main className="max-w-[1400px] mx-auto p-4 space-y-4">
        <div className="space-y-2">
          <CollapsibleSection
            title="Advanced Settings"
            icon="⚙️"
            isOpen={advancedOpen}
            onToggle={() => setAdvancedOpen(!advancedOpen)}
          >
            <div className="p-4 text-sm text-[#8a8fa5]">
              Advanced settings coming soon...
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Focus Quests & Allowed Maps"
            icon="🎯"
            isOpen={focusOpen}
            onToggle={() => setFocusOpen(!focusOpen)}
          >
            <div className="p-4 text-sm text-[#8a8fa5]">
              Focus settings coming soon...
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Inventory (Keys & Items)"
            icon="📦"
            isOpen={inventoryOpen}
            onToggle={() => setInventoryOpen(!inventoryOpen)}
          >
            <div className="p-4 text-sm text-[#8a8fa5]">
              Inventory management coming soon...
            </div>
          </CollapsibleSection>
        </div>

        {result && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold">📋 Planned Sweeps</h2>
              <div className="text-sm text-[#8a8fa5]">
                Sweeps: {result.sweeps.length} — {result.totalTasks} unique tasks — Efficiency: {result.efficiency.toFixed(1)}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {result.sweeps.map((sweep, sweepIdx) => {
                const mapEmoji = getMapEmoji(sweep.map);
                return (
                  <Card key={sweepIdx} className="bg-[#1a1d2e] border-[#24283b] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{mapEmoji}</span>
                      <h3 className="text-lg font-bold">#{sweepIdx + 1} — {sweep.map}</h3>
                    </div>

                    <div className="text-xs text-[#8a8fa5] mb-3">
                      {sweep.uniqueTasks} unique tasks ({sweep.steps.length} objectives) • cost ≈ {sweep.estimatedCost.toFixed(1)}
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const taskGroups = new Map<string, SweepStep[]>();
                        sweep.steps.forEach(step => {
                          if (!taskGroups.has(step.taskId)) {
                            taskGroups.set(step.taskId, []);
                          }
                          taskGroups.get(step.taskId)!.push(step);
                        });

                        return Array.from(taskGroups.entries()).map(([taskId, steps]) => {
                          const firstStep = steps[0];

                          return (
                            <div key={taskId} className="bg-[#0e0f13] rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                                    <span>{firstStep.taskName}</span>
                                    {firstStep.trader && (
                                      <Badge variant="secondary" className="text-[10px] bg-[#6b73ff]/20 text-[#6b73ff]">
                                        {firstStep.trader}
                                      </Badge>
                                    )}
                                    {firstStep.kappaRequired && (
                                      <Badge className="text-[10px] bg-[#fbbf24]/20 text-[#fbbf24]">
                                        Kappa
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <a
                                  href={`https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(firstStep.taskName)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#6b73ff] hover:text-[#8a9aff]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              <div className="space-y-1.5 pl-2">
                                {steps.map((step) => {
                                  const objKey = `${step.taskId}:${step.objectiveId}`;
                                  const isCompleted = completedObjectives.has(objKey);

                                  return (
                                    <div
                                      key={step.objectiveId}
                                      className="flex items-start gap-2 text-xs"
                                    >
                                      <Checkbox
                                        checked={isCompleted}
                                        onCheckedChange={() => handleToggleObjective(step.taskId, step.objectiveId)}
                                        className="mt-0.5"
                                      />
                                      <span className={isCompleted ? 'line-through text-[#8a8fa5]' : 'text-[#e8eaf6]'}>
                                        {step.description}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {!result && (
          <div className="text-center py-12 text-[#8a8fa5]">
            Click &quot;Recalculate Route&quot; to generate an optimized quest path
          </div>
        )}
      </main>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-[#1a1d2e] border-[#24283b] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#2a2e45] transition-colors"
      >
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        <span className="text-lg">{icon}</span>
        <span className="font-semibold">{title}</span>
      </button>
      {isOpen && <div className="border-t border-[#24283b]">{children}</div>}
    </Card>
  );
}
