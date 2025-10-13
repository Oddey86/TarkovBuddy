"use client";

import { createClient } from "./supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export class TarkovStorage {
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;
  private initialized = false;

  private getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const supabase = this.getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      this.userId = session?.user?.id || null;
    } catch (error) {
      console.warn("Failed to initialize Supabase:", error);
    }
  }

  isLoggedIn(): boolean {
    return this.userId !== null;
  }

  async getUser() {
    try {
      const supabase = this.getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.warn("Failed to get user:", error);
      return null;
    }
  }

  getData(key: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }

  async setData(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;

    localStorage.setItem(key, value);

    if (this.isLoggedIn()) {
      try {
        const supabase = this.getSupabase();
        await supabase.from("user_progress").upsert(
          {
            user_id: this.userId,
            data_key: key,
            data_value: value,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,data_key",
          }
        );
      } catch (error) {
        console.error("Failed to sync to cloud:", error);
      }
    }
  }

  async syncFromCloud(): Promise<void> {
    if (!this.isLoggedIn()) return;

    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("user_progress")
        .select("data_key, data_value")
        .eq("user_id", this.userId);

      if (error) throw error;

      if (data) {
        for (const row of data) {
          localStorage.setItem(row.data_key, row.data_value);
        }
      }
    } catch (error) {
      console.error("Failed to sync from cloud:", error);
    }
  }

  async signInWithProvider(provider: "google" | "twitch" | "discord") {
    try {
      const supabase = this.getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to sign in:", error);
      throw error;
    }
  }

  async signOut() {
    try {
      const supabase = this.getSupabase();
      await supabase.auth.signOut();
      this.userId = null;
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }

  onAuthStateChange(
    callback: (event: string, session: any) => void
  ): { unsubscribe: () => void } {
    try {
      const supabase = this.getSupabase();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        this.userId = session?.user?.id || null;
        callback(event, session);
      });

      return {
        unsubscribe: () => subscription.unsubscribe(),
      };
    } catch (error) {
      console.error("Failed to set up auth state change listener:", error);
      return {
        unsubscribe: () => {},
      };
    }
  }
}

export const storage = new TarkovStorage();

export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to save to storage:", error);
  }
}

export interface ProgressData {
  completedQuests?: string[];
  completedObjectives?: string[];
  playerLevel?: number;
}

export function loadProgress(): ProgressData {
  return getStorageItem<ProgressData>('tarkov-progress', {});
}

export function saveProgress(progress: ProgressData): void {
  setStorageItem('tarkov-progress', progress);
}
