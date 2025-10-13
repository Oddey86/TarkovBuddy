// lib/questState.ts
"use client";

import { storage, loadProgress as storageLoadProgress, saveProgress } from "@/lib/storage";

// === Legacy-lik nøkkelbruk ===
const TASKS_KEY       = "tt_kappa_tasks_v3";     // questId -> boolean
const UNDO_KEY        = "tt_kappa_undo_v3";      // stack av QuestCompletionMap snapshots
const HIDEOUT_KEY     = "tt_hideout_levels_v1";  // level -> selected (for "select all" per level)
const HIDEOUT_ITEMS_KEY = "tt_hideout_items_v1"; // itemId -> count

// Merk: objectives + playerLevel hentes fra loadProgress()/saveProgress()
// lagret i key 'tarkov-progress' i storage.ts

// ---------- typer ----------
export type QuestCompletionMap = Record<string, boolean>;
export type ObjectiveMap = Record<string, boolean>;
export type HideoutItemsMap = Record<string, number>; // itemId -> count

type QuestStateForUI = {
  completedQuests: string[];
  map: QuestCompletionMap;
  completedObjectives: string[]; // lagt til for optimizer
  playerLevel?: number;          // lagt til for optimizer
};

type Subscriber = (state: QuestStateForUI) => void;

// ---------- subscribers ----------
let subscribers: Subscriber[] = [];

function notify() {
  const s = getQuestState();
  for (const cb of subscribers) cb(s);
}

export function subscribeToQuestState(cb: Subscriber): () => void {
  subscribers.push(cb);
  return () => {
    subscribers = subscribers.filter((x) => x !== cb);
  };
}

// ---------- JSON helpers ----------
function parseJSON<T>(s: string | null, fallback: T): T {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}

async function saveJSON(key: string, value: any) {
  const json = JSON.stringify(value);
  if (typeof window !== "undefined") localStorage.setItem(key, json);
  try {
    await storage.init();
    if (storage.isLoggedIn()) await storage.setData(key, json);
  } catch { /* best effort */ }
}

function loadJSON<T>(key: string, fallback: T): T {
  const local = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  return parseJSON<T>(local, fallback);
}

// ============================================================================
// Re-eksporter loadProgress fra storage.ts
// ============================================================================
export { loadProgress } from "@/lib/storage";

// ============================================================================
// Quests (legacy semantikk)
// ============================================================================
export function getQuestCompletion(): QuestCompletionMap {
  return loadJSON<QuestCompletionMap>(TASKS_KEY, {});
}

export async function setQuestCompletion(map: QuestCompletionMap) {
  await saveJSON(TASKS_KEY, map);
  notify();
}

export function getQuestState(): QuestStateForUI {
  const map = getQuestCompletion();
  const completedQuests = Object.keys(map).filter((k) => !!map[k]);

  // Hent objectives og playerLevel fra 'tarkov-progress' (storage.ts)
  const progress = storageLoadProgress(); // { completedObjectives?: string[]; playerLevel?: number; ... }
  const completedObjectives = progress.completedObjectives ?? [];

  return {
    completedQuests,
    map,
    completedObjectives,
    playerLevel: progress.playerLevel,
  };
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

// ============================================================================
// Undo-stack for quests (snapshot-basert, legacy stil)
// ============================================================================
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

export async function undoLastQuestChange(): Promise<boolean> {
  const prev = await popQuestUndoSnapshot();
  if (!prev) return false;
  await setQuestCompletion(prev);
  return true;
}

// ============================================================================
// Objectives (brukes av optimizer)
// ============================================================================
export async function toggleQuestObjective(objectiveId: string, done: boolean) {
  const progress = storageLoadProgress();
  const set = new Set(progress.completedObjectives ?? []);
  if (done) set.add(objectiveId); else set.delete(objectiveId);
  progress.completedObjectives = Array.from(set);
  saveProgress(progress); // local; hvis du vil, kan du også kalle storage.setData her
  notify();
}

// ============================================================================
// Hideout – minimal global «select all levels»-status for komponenten din
// ============================================================================
type HideoutLevelsMap = Record<number, boolean>; // level -> selected

function getHideoutLevels(): HideoutLevelsMap {
  return loadJSON<HideoutLevelsMap>(HIDEOUT_KEY, {});
}

async function setHideoutLevels(map: HideoutLevelsMap) {
  await saveJSON(HIDEOUT_KEY, map);
  // HideoutTracker lytter kanskje ikke her, men notify() skader ikke.
  notify();
}

/**
 * Alias for HideoutTracker-kompatibilitet
 */
export async function toggleHideoutLevelSelection(level: number, selected: boolean) {
  await setAllHideoutLevelsSelected(level, selected);
}

/**
 * Global toggling av "alle på gitt level" (brukes av components/HideoutTracker.tsx).
 * Vi lagrer kun en global switch pr. level, som komponenten kan bruke som kilde.
 */
export async function setAllHideoutLevelsSelected(level: number, selected: boolean) {
  const m = { ...getHideoutLevels() };
  m[level] = selected;
  await setHideoutLevels(m);
}

// (valgfritt) Lesestatus for komponenten
export function isHideoutLevelSelected(level: number): boolean {
  const m = getHideoutLevels();
  return !!m[level];
}

// ============================================================================
// Hideout Items - tracking av items som trengs for hideout
// ============================================================================
function getHideoutItems(): HideoutItemsMap {
  return loadJSON<HideoutItemsMap>(HIDEOUT_ITEMS_KEY, {});
}

async function setHideoutItems(map: HideoutItemsMap) {
  await saveJSON(HIDEOUT_ITEMS_KEY, map);
  notify();
}

/**
 * Oppdater antall av et hideout item
 */
export async function updateHideoutItemCount(itemId: string, count: number) {
  const items = { ...getHideoutItems() };
  if (count <= 0) {
    delete items[itemId];
  } else {
    items[itemId] = count;
  }
  await setHideoutItems(items);
}

/**
 * Hent antall av et hideout item
 */
export function getHideoutItemCount(itemId: string): number {
  const items = getHideoutItems();
  return items[itemId] || 0;
}

/**
 * Hent alle hideout items
 */
export function getAllHideoutItems(): HideoutItemsMap {
  return getHideoutItems();
}

// ============================================================================
// Quest Items - tracking av items som trengs for quests
// ============================================================================
const QUEST_ITEMS_KEY = "tt_quest_items_v1"; // itemId -> count

type QuestItemsMap = Record<string, number>; // itemId -> count

function getQuestItems(): QuestItemsMap {
  return loadJSON<QuestItemsMap>(QUEST_ITEMS_KEY, {});
}

async function setQuestItems(map: QuestItemsMap) {
  await saveJSON(QUEST_ITEMS_KEY, map);
  notify();
}

/**
 * Oppdater antall av et quest item
 */
export async function updateQuestItemCount(itemId: string, count: number) {
  const items = { ...getQuestItems() };
  if (count <= 0) {
    delete items[itemId];
  } else {
    items[itemId] = count;
  }
  await setQuestItems(items);
}

/**
 * Hent antall av et quest item
 */
export function getQuestItemCount(itemId: string): number {
  const items = getQuestItems();
  return items[itemId] || 0;
}

/**
 * Hent alle quest items
 */
export function getAllQuestItems(): QuestItemsMap {
  return getQuestItems();
}

// ============================================================================
// Migrering (hold tom inntil du trenger å mappe gamle nøkler til nye)
// ============================================================================
export function migrateOldData() {
  // map gamle → nye her ved behov
}
