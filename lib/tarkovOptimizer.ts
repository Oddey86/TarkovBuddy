export interface Task {
  id: string;
  name: string;
  trader?: string;
  minPlayerLevel: number;
  kappaRequired?: boolean;
  requires: string[];
  objectives: Objective[];
  neededKeys?: string[];
}

export interface Objective {
  id: string;
  description: string;
  maps?: string[];
}

export interface OptimizationWeights {
  mapSwitchPenalty: number;
  missingKeyPenalty: number;
  missingItemPenalty: number;
}

export interface OptimizationFlags {
  kappaFocus: boolean;
  ignoreMissingKeys: boolean;
}

export interface Inventory {
  keys: string[];
  items: string[];
}

export interface SweepStep {
  taskId: string;
  taskName: string;
  objectiveId: string;
  description: string;
  trader?: string;
  kappaRequired?: boolean;
  neededKeys: string[];
  maps: string[];
}

export interface Sweep {
  map: string;
  steps: SweepStep[];
  uniqueTasks: number;
  estimatedCost: number;
}

export interface OptimizationResult {
  sweeps: Sweep[];
  totalScore: number;
  totalTasks: number;
  efficiency: number;
}

function textHasAnyNeedle(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function distanceToTargets(tasks: Task[], targets: Set<string>): Map<string, number> {
  const dist = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const t of tasks) {
    graph.set(t.id, t.requires);
  }

  const queue: Array<{ id: string; distance: number }> = [];
  for (const id of Array.from(targets)) {
    queue.push({ id, distance: 0 });
    dist.set(id, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const deps = graph.get(current.id) || [];

    for (const depId of deps) {
      if (!dist.has(depId)) {
        const newDist = current.distance + 1;
        dist.set(depId, newDist);
        queue.push({ id: depId, distance: newDist });
      }
    }
  }

  return dist;
}

export function optimize(
  tasks: Task[],
  playerLevel: number,
  completed: Set<string>,
  weights: OptimizationWeights,
  flags: OptimizationFlags,
  focusTargets: Set<string>,
  allowedMaps: Set<string>,
  inventory: Inventory,
  completedObjectives: Set<string>
): OptimizationResult {
  const todo = tasks.filter((t) => t.minPlayerLevel <= playerLevel && !completed.has(t.id));
  const filteredIds = new Set(todo.map((t) => t.id));

  const indeg = new Map<string, number>();
  const rev = new Map<string, string[]>();

  for (const t of todo) {
    indeg.set(t.id, 0);
    rev.set(t.id, []);
  }

  for (const t of todo) {
    for (const reqId of t.requires) {
      if (!rev.has(reqId)) rev.set(reqId, []);
      rev.get(reqId)!.push(t.id);
    }
  }

  for (const t of todo) {
    let unfulfilled = 0;
    for (const reqId of t.requires) {
      const isCompleted = completed.has(reqId);
      const isInFilteredList = filteredIds.has(reqId);
      if (!isCompleted && isInFilteredList) unfulfilled++;
    }
    indeg.set(t.id, unfulfilled);
  }

  const avail = new Set(todo.filter((t) => (indeg.get(t.id) || 0) === 0).map((t) => t.id));
  const idMap = new Map(todo.map((t) => [t.id, t]));
  const focusDist = focusTargets.size ? distanceToTargets(todo, focusTargets) : new Map();

  const sweeps: Sweep[] = [];
  const usedInSweeps = new Map<string, number>();
  const maxIter = todo.length * 2;
  let iter = 0;

  while (avail.size && iter++ < maxIter) {
    const mapBuckets = new Map<string, SweepStep[]>();

    for (const id of Array.from(avail)) {
      const t = idMap.get(id);
      if (!t) continue;

      let hasAnyUnused = false;
      for (const obj of t.objectives) {
        const objKey = `${t.id}:${obj.id}`;
        if (!completedObjectives.has(objKey) && !usedInSweeps.has(objKey)) {
          hasAnyUnused = true;
          break;
        }
      }

      if (!hasAnyUnused) {
        avail.delete(id);
        for (const nxt of rev.get(id) || []) {
          if (!idMap.has(nxt)) continue;
          const cur = Math.max(0, (indeg.get(nxt) || 0) - 1);
          indeg.set(nxt, cur);
          if (cur === 0) avail.add(nxt);
        }
        continue;
      }

      let hadMap = false;

      for (const obj of t.objectives) {
        const objKey = `${t.id}:${obj.id}`;
        if (completedObjectives.has(objKey) || usedInSweeps.has(objKey)) continue;

        const maps = obj.maps && obj.maps.length ? obj.maps : ['Unknown'];
        const usable = maps.filter((m) => allowedMaps.has(m));
        if (usable.length === 0) continue;
        hadMap = true;

        for (const m of usable) {
          if (!mapBuckets.has(m)) mapBuckets.set(m, []);
          mapBuckets.get(m)!.push({
            taskId: t.id,
            taskName: t.name,
            objectiveId: obj.id,
            description: obj.description,
            trader: t.trader,
            kappaRequired: t.kappaRequired,
            neededKeys: t.neededKeys || [],
            maps: [m],
          });
        }
      }

      if (!hadMap && allowedMaps.has('Unknown')) {
        if (!mapBuckets.has('Unknown')) mapBuckets.set('Unknown', []);
        mapBuckets.get('Unknown')!.push({
          taskId: t.id,
          taskName: t.name,
          objectiveId: 'n/a',
          description: '',
          trader: t.trader,
          kappaRequired: t.kappaRequired,
          neededKeys: t.neededKeys || [],
          maps: ['Unknown'],
        });
      }
    }

    if (mapBuckets.size === 0) break;

    let bestEntry: [string, SweepStep[]] | null = null;
    let bestScore = -1;

    for (const [map, steps] of Array.from(mapBuckets.entries())) {
      const uniqueTasks = new Set(steps.map((s) => s.taskId));
      let base = uniqueTasks.size;

      let focusBonus = 0;
      for (const tid of Array.from(uniqueTasks)) {
        if (focusDist.has(tid)) {
          const d = focusDist.get(tid)!;
          focusBonus += Math.max(0, 5 - Math.min(5, d));
        }
      }

      if (flags.kappaFocus) {
        const kCount = steps.filter((s) => s.kappaRequired).length;
        focusBonus += kCount * 1.5;
      }

      let penalties = 0;
      for (const s of steps) {
        const desc = s.description || '';
        const mentionsKeyWord = /key/i.test(desc);
        const hasSpecificKey = textHasAnyNeedle(desc, inventory.keys);
        if (mentionsKeyWord && !hasSpecificKey && !flags.ignoreMissingKeys) {
          penalties += weights.missingKeyPenalty / 50;
        }
        if (/(find|hand over|obtain|deliver|mark)/i.test(desc) && !textHasAnyNeedle(desc, inventory.items)) {
          penalties += weights.missingItemPenalty / 100;
        }
      }

      const score = base + focusBonus - penalties;
      if (score > bestScore) {
        bestScore = score;
        bestEntry = [map, steps];
      }
    }

    if (!bestEntry) break;

    const [bestMap, steps] = bestEntry;
    const unique = new Set(steps.map((s) => s.taskId));
    let estimatedCost = weights.mapSwitchPenalty;
    if (unique.size >= 5) estimatedCost *= 0.8;
    else if (unique.size >= 3) estimatedCost *= 0.9;

    let chainCount = 0;
    for (const tid of Array.from(unique)) if (focusDist.has(tid)) chainCount++;
    if (chainCount >= 3) estimatedCost *= 0.85;
    else if (chainCount >= 1) estimatedCost *= 0.93;

    sweeps.push({ map: bestMap, steps, uniqueTasks: unique.size, estimatedCost });

    for (const step of steps) {
      const objKey = `${step.taskId}:${step.objectiveId}`;
      usedInSweeps.set(objKey, sweeps.length - 1);
    }
  }

  const totalScore = sweeps.reduce((a, s) => a + s.estimatedCost, 0);
  const totalTasks = sweeps.reduce((a, s) => a + s.uniqueTasks, 0);
  return { sweeps, totalScore, totalTasks, efficiency: totalTasks / Math.max(1, sweeps.length) };
}

export const MAP_EMOJIS: Record<string, string> = {
  Factory: '🏭',
  Customs: '🏗️',
  Woods: '🌲',
  Shoreline: '🏖️',
  Interchange: '🏬',
  Reserve: '🏛️',
  Labs: '🔬',
  Lighthouse: '🗼',
  Streets: '🏙️',
  'Ground Zero': '⚡',
  Unknown: '❓',
};

export function getMapEmoji(mapName: string): string {
  return MAP_EMOJIS[mapName] || '🗺️';
}
