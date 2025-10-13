// lib/questState.ts
"use client";

import { storage } from "@/lib/storage";

// === Nøkler (samme som legacy quest.html) ===
const TASKS_KEY = "tt_kappa_tasks_v3";
const UNDO_KEY  = "tt_kappa_undo_v3";

// === Typer ===
export type QuestCompletionMap = Record<string, boolean>;
type Subscriber = (state: { completedQuests: string[]; map: QuestCompletionMap }) => void;

let subscribers: Subscriber[] = [];

function notify() {
  const s = getQuestState();
  for (const cb of subscribers) cb(s);
}

export function subscribeToQuestState(cb: Subscriber) {
  subscribers.push(cb);
  return () => (subscribers = subscribers.filter((x) => x !== cb));
}

// === JSON helpers som speiler gammel atferd ===
function parseJSON<T>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON(key: string, value: any) {
  const json = JSON.stringify(value);
  // Lokal alltid
  localStorage.setItem(key, json);
  // Sky hvis innlogget
  try {
    await storage.init();
    if (storage.isLoggedIn()) {
      await storage.setData(key, json);
    }
  } catch {
    /* best effort */
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  // Foretrekk localStorage for hastighet/konsistens i UI
  const local = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  return parseJSON<T>(local, fallback);
}

// === Public state-API (identisk semantikk som tidligere) ===
export function getQuestCompletion(): QuestCompletionMap {
  return loadJSON<QuestCompletionMap>(TASKS_KEY, {});
}

export async function setQuestCompletion(map: QuestCompletionMap) {
  await saveJSON(TASKS_KEY, map);
  notify();
}

/** Returnerer { completedQuests, map } for eksisterende UI */
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

// === Undo-stack (persistent) ===
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

// For kompatibilitet hvis du hadde konverteringer før
export function migrateOldData() {
  // Her kan du mappe gamle nøkler → nye hvis det trengs.
  // Bevisst tom – du brukte allerede tt_kappa_* i legacy.
}
