"use client";

import { getStorageItem, setStorageItem } from './storage';

export interface QuestStateData {
  completedQuests: string[];
  completedObjectives: string[];
  questItemCounts: Record<string, number>;
  hideoutItemCounts: Record<string, number>;
  hideoutSelectedLevels: Record<string, boolean>;
  hideoutCompletedLevels: Record<string, boolean>;
  playerLevel: number;
}

const STORAGE_KEY = 'tt_quest_state_v1';

const defaultState: QuestStateData = {
  completedQuests: [],
  completedObjectives: [],
  questItemCounts: {},
  hideoutItemCounts: {},
  hideoutSelectedLevels: {},
  hideoutCompletedLevels: {},
  playerLevel: 1,
};

let listeners: Array<(state: QuestStateData) => void> = [];

export function getQuestState(): QuestStateData {
  return getStorageItem<QuestStateData>(STORAGE_KEY, defaultState);
}

export function saveQuestState(state: QuestStateData): void {
  setStorageItem(STORAGE_KEY, state);
  notifyListeners(state);
}

export function subscribeToQuestState(callback: (state: QuestStateData) => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners(state: QuestStateData): void {
  listeners.forEach(listener => listener(state));
}

export function completeQuest(questId: string, prerequisites: string[] = []): void {
  const state = getQuestState();
  const newCompleted = new Set(state.completedQuests);

  newCompleted.add(questId);
  prerequisites.forEach(preReqId => newCompleted.add(preReqId));

  saveQuestState({
    ...state,
    completedQuests: Array.from(newCompleted),
  });
}

export function uncompleteQuest(questId: string): void {
  const state = getQuestState();
  saveQuestState({
    ...state,
    completedQuests: state.completedQuests.filter(id => id !== questId),
  });
}

export function toggleQuestObjective(questId: string, objectiveId: string): void {
  const state = getQuestState();
  const objKey = `${questId}:${objectiveId}`;
  const completedSet = new Set(state.completedObjectives);

  if (completedSet.has(objKey)) {
    completedSet.delete(objKey);
  } else {
    completedSet.add(objKey);
  }

  saveQuestState({
    ...state,
    completedObjectives: Array.from(completedSet),
  });
}

export function updateQuestItemCount(itemKey: string, count: number): void {
  const state = getQuestState();
  saveQuestState({
    ...state,
    questItemCounts: {
      ...state.questItemCounts,
      [itemKey]: count,
    },
  });
}

export function updateHideoutItemCount(itemKey: string, count: number): void {
  const state = getQuestState();
  saveQuestState({
    ...state,
    hideoutItemCounts: {
      ...state.hideoutItemCounts,
      [itemKey]: count,
    },
  });
}

export function updatePlayerLevel(level: number): void {
  const state = getQuestState();
  saveQuestState({
    ...state,
    playerLevel: level,
  });
}

export function toggleHideoutLevelSelection(levelKey: string): void {
  const state = getQuestState();
  const newSelections = { ...state.hideoutSelectedLevels };
  newSelections[levelKey] = !newSelections[levelKey];
  saveQuestState({
    ...state,
    hideoutSelectedLevels: newSelections,
  });
}

export function setAllHideoutLevelsSelected(selected: boolean, levels: string[]): void {
  const state = getQuestState();
  const newSelections: Record<string, boolean> = {};
  levels.forEach(key => {
    newSelections[key] = selected;
  });
  saveQuestState({
    ...state,
    hideoutSelectedLevels: newSelections,
  });
}

export function toggleHideoutLevelCompleted(levelKey: string): void {
  const state = getQuestState();
  const newCompleted = { ...state.hideoutCompletedLevels };
  newCompleted[levelKey] = !newCompleted[levelKey];
  saveQuestState({
    ...state,
    hideoutCompletedLevels: newCompleted,
  });
}

export function migrateOldData(): void {
  const oldKappaTasks = getStorageItem<string[]>('tt_kappa_tasks_v3', []);
  const oldObjectives = getStorageItem<string[]>('tt_completed_objectives_v1', []);
  const oldQuestItems = getStorageItem<Record<string, number>>('tt_quest_items_v3', {});
  const oldHideoutItems = getStorageItem<Record<string, number>>('tt_hideout_items_v3', {});
  const oldSelectedLevels = getStorageItem<Record<string, boolean>>('tt_hideout_selected_levels_v1', {});
  const oldCompletedLevels = getStorageItem<Record<string, boolean>>('hideout_completed_levels', {});
  const oldProgress = getStorageItem<any>('tarkov-progress', {});

  const state = getQuestState();

  if (oldKappaTasks.length > 0 || oldObjectives.length > 0 || Object.keys(oldQuestItems).length > 0) {
    saveQuestState({
      completedQuests: oldKappaTasks.length > 0 ? oldKappaTasks : state.completedQuests,
      completedObjectives: oldObjectives.length > 0 ? oldObjectives : state.completedObjectives,
      questItemCounts: Object.keys(oldQuestItems).length > 0 ? oldQuestItems : state.questItemCounts,
      hideoutItemCounts: Object.keys(oldHideoutItems).length > 0 ? oldHideoutItems : state.hideoutItemCounts,
      hideoutSelectedLevels: Object.keys(oldSelectedLevels).length > 0 ? oldSelectedLevels : state.hideoutSelectedLevels,
      hideoutCompletedLevels: Object.keys(oldCompletedLevels).length > 0 ? oldCompletedLevels : state.hideoutCompletedLevels,
      playerLevel: oldProgress.playerLevel || state.playerLevel,
    });
  }
}
