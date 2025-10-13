// lib/questState.ts
"use client";

import { storage } from "@/lib/storage";

// === Legacy-lik nøkkelbruk ===
const TASKS_KEY       = "tt_kappa_tasks_v3";     // questId -> boolean
const UNDO_KEY        = "tt_kappa_undo_v3";      // stack av QuestCompletionMap snapshots
const OBJECTIVES_KEY  = "tt_kappa_objectives_v1"; // objectiveId -> boolean (for optimizer)

export type QuestCompletionMap = Record<string, boolean>;
export type ObjectiveMap = Record<string, boolean>;

type Subscriber = (state: {
  completedQuests: string[];
  map: QuestCompletionMap;
}) => void;

let subscribers: Subscriber[] = [];

function notify() {
  const s = getQuestState();
  for (const cb of subscribers) cb(s);
}

export function subscribeToQuestState(cb: Subscriber) {
  subscribers.push(cb);
  return () => (subscribers = subscribers.filter((x) => x !== cb));
}

// ---------- JSON helpers ----------
function parseJSON<T>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON(key: string, value: any) {
  const json = JSON.stringify(value);
  if (typeof window !== "undefined") localStorage.setItem(key, json);
  try {
    await storage.init();
    if (storage.isLoggedIn()) await storage.setData(key, json);
  } catch {
    /* best effort */
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  const local = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  return parseJSON<T>(local, fallback);
}

// ---------- Quests (legacy semantikk) ----------
export function getQuestCompletion(): QuestCompletionMap {
  return loadJSON<QuestCompletionMap>(TASKS_KEY, {});
}

export async function setQuestCompletion(map: QuestCompletionMap) {
  await saveJSON(TASKS_KEY, map);
  notify();
}

export function getQuestState() {
  const map = getQuestCompletion();
  const completedQuests = Object.keys(map).filter((k) => !!map[k]);
  return { completedQuests, map };
}

export async function completeQuest(id: string, prereqs: string[] = []) {
  const map = { ...getQuestCompletion() };
  map[id] = true;
  for (const p of prereqs) map[p] = true;
  await setQuestCompletion(map);
}

export async function uncompleteQuest(id: string) {
  const map = { ...getQuestCompletion() };
  map[id] = false;
  await setQuestCompletion(map);
}

// ---------- Undo-stack for quests ----------
export function getQuestUndoCount(): number {
  const stack = loadJSON<QuestCompletionMap[]>(UNDO_KEY, []);
  return stack.length;
}

export async function pushQuestUndoSnapshot() {
  const stack = loadJSON<QuestCompletionMap[]>(UNDO_KEY, []);
  stack.push(getQuestCompletion());
  await saveJSON(UNDO_KEY, stack);
}

export async function popQuestUndoSnapshot(): Promise<QuestCompletionMap | null> {
  const stack = loadJSON<QuestCompletionMap[]>(UNDO_KEY, []);
  if (!stack.length) return null;
  const last = stack.pop()!;
  await saveJSON(UNDO_KEY, stack);
  return last;
}

// 🟪 Dette manglet hos deg – UndoButton importerer denne:
export async function undoLastQuestChange(): Promise<boolean> {
  const prev = await popQuestUndoSnapshot();
  if (!prev) return false;
  await setQuestCompletion(prev);
  return true;
}

// ---------- Objectives (for optimizer) ----------
export function getObjectiveMap(): ObjectiveMap {
  return loadJSON<ObjectiveMap>(OBJECTIVES_KEY, {});
}

export async function setObjectiveMap(map: ObjectiveMap) {
  await saveJSON(OBJECTIVES_KEY, map);
  // Om optimizer-siden lytter på subscribeToQuestState for redraw, trigge notify():
  notify();
}

// 🟪 Dette manglet – optimizer importerer denne:
export async function toggleQuestObjective(objectiveId: string, done: boolean) {
  const map = { ...getObjectiveMap() };
  map[objectiveId] = done;
  await setObjectiveMap(map);
}

// ---------- Migrering (tom – beholdt for kompatibilitet) ----------
export function migrateOldData() {
  // Legg evt. konvertering av gamle nøkler → nye her.
}
