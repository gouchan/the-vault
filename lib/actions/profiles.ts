"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PROFILE: Omit<Profile, "id" | "created_at" | "updated_at"> = {
  username: "me",
  display_name: "My Vault",
  bio: "Personal research, ideas, and connections.",
  avatar_url: null,
  cover_url: null,
  website: null,
  twitter: null,
  instagram: null,
  linkedin: null,
};

export async function getProfile(username = "me"): Promise<Profile | null> {
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export async function upsertProfile(profile: Partial<Profile> & { username: string }): Promise<Profile | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("profiles")
    .upsert({ ...DEFAULT_PROFILE, ...profile }, { onConflict: "username" })
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
