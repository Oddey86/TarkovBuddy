// lib/questState.ts
"use client";

import { storage, loadProgress as storageLoadProgress, saveProgress } from "@/lib/storage";

// === Legacy-lik nøkkelbruk ===
const TASKS_KEY       = "tt_kappa_tasks_v3";     // questId -> boolean
const UNDO_KEY        = "tt_kappa_undo_v3";      // stack av QuestCompletionMap snapshots
const HIDEOUT_KEY     = "tt_hideout_levels_v1";  // level -> selected (for "select all" per level)
const HIDEOUT_ITEMS_KEY = "tt_hideout_items_v3"; // itemId -> count
const HIDEOUT_SELECTED_KEY = "tt_hideout_selected_levels_v1"; // levelKey -> selected
const HIDEOUT_COMPLETED_KEY = "hideout_completed_levels"; // levelKey -> completed
const QUEST_ITEMS_KEY = "tt_quest_items_v1"; // itemId -> count

// Merk: objectives + playerLevel hentes fra loadProgress()/saveProgress()
// lagret i key 'tarkov-progress' i storage.ts

// ---------- typer ----------
export type QuestCompletionMap = Record<string, boolean>;
export type ObjectiveMap = Record<string, boolean>;
export type HideoutItemsMap = Record<string, number>; // itemId -> count
export type QuestItemsMap = Record<string, number>; // itemId -> count
export type LevelSelections = Record<string, boolean>; // levelKey -> selected

type QuestStateForUI = {
  completedQuests: string[];
  map: QuestCompletionMap;
  completedObjectives: string[]; // lagt til for optimizer
  playerLevel?: number;          // lagt til for optimizer
  hideoutItemCounts: HideoutItemsMap; // lagt til for HideoutTracker
  hideoutSelectedLevels: LevelSelections; // lagt til for HideoutTracker
  hideoutCompletedLevels: LevelSelections; // lagt til for HideoutTracker
  questItemCounts: QuestItemsMap; // lagt til for quest-items page
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
  const progress = storageLoadProgress();
  const completedObjectives = progress.completedObjectives ?? [];

  // Hent hideout data
  const hideoutItemCounts = getHideoutItems();
  const hideoutSelectedLevels = getHideoutSelectedLevels();
  const hideoutCompletedLevels = getHideoutCompletedLevels();

  // Hent quest items
  const questItemCounts = getQuestItems();

  return {
    completedQuests,
    map,
    completedObjectives,
    playerLevel: progress.playerLevel,
    hideoutItemCounts,
    hideoutSelectedLevels,
    hideoutCompletedLevels,
    questItemCounts,
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
  saveProgress(progress);
  notify();
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

export async function updateHideoutItemCount(itemId: string, count: number) {
  const items = { ...getHideoutItems() };
  if (count <= 0) {
    delete items[itemId];
  } else {
    items[itemId] = count;
  }
  await setHideoutItems(items);
}

export function getHideoutItemCount(itemId: string): number {
  const items = getHideoutItems();
  return items[itemId] || 0;
}

export function getAllHideoutItems(): HideoutItemsMap {
  return getHideoutItems();
}

// ============================================================================
// Hideout Selected Levels
// ============================================================================
function getHideoutSelectedLevels(): LevelSelections {
  return loadJSON<LevelSelections>(HIDEOUT_SELECTED_KEY, {});
}

async function setHideoutSelectedLevels(map: LevelSelections) {
  await saveJSON(HIDEOUT_SELECTED_KEY, map);
  notify();
}

export async function toggleHideoutLevelSelection(levelKey: string) {
  const levels = { ...getHideoutSelectedLevels() };
  levels[levelKey] = !levels[levelKey];
  await setHideoutSelectedLevels(levels);
}

export async function setAllHideoutLevelsSelected(selected: boolean, levelKeys: string[]) {
  const levels = { ...getHideoutSelectedLevels() };
  for (const key of levelKeys) {
    levels[key] = selected;
  }
  await setHideoutSelectedLevels(levels);
}

export function isHideoutLevelSelected(levelKey: string): boolean {
  const levels = getHideoutSelectedLevels();
  return !!levels[levelKey];
}

// ============================================================================
// Hideout Completed Levels
// ============================================================================
function getHideoutCompletedLevels(): LevelSelections {
  return loadJSON<LevelSelections>(HIDEOUT_COMPLETED_KEY, {});
}

async function setHideoutCompletedLevels(map: LevelSelections) {
  await saveJSON(HIDEOUT_COMPLETED_KEY, map);
  notify();
}

export async function toggleHideoutLevelCompleted(levelKey: string) {
  const levels = { ...getHideoutCompletedLevels() };
  levels[levelKey] = !levels[levelKey];
  await setHideoutCompletedLevels(levels);
}

export function isHideoutLevelCompleted(levelKey: string): boolean {
  const levels = getHideoutCompletedLevels();
  return !!levels[levelKey];
}

// ============================================================================
// Quest Items - tracking av items som trengs for quests
// ============================================================================
function getQuestItems(): QuestItemsMap {
  return loadJSON<QuestItemsMap>(QUEST_ITEMS_KEY, {});
}

async function setQuestItems(map: QuestItemsMap) {
  await saveJSON(QUEST_ITEMS_KEY, map);
  notify();
}

export async function updateQuestItemCount(itemId: string, count: number) {
  const items = { ...getQuestItems() };
  if (count <= 0) {
    delete items[itemId];
  } else {
    items[itemId] = count;
  }
  await setQuestItems(items);
}

export function getQuestItemCount(itemId: string): number {
  const items = getQuestItems();
  return items[itemId] || 0;
}

export function getAllQuestItems(): QuestItemsMap {
  return getQuestItems();
}

// ============================================================================
// Migrering (hold tom inntil du trenger å mappe gamle nøkler til nye)
// ============================================================================
export function migrateOldData() {
  // map gamle → nye her ved behov
}
