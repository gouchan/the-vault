"use client";

import { useState, useEffect } from "react";
import { getProfile, upsertProfile, type Profile } from "@/lib/actions/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Globe, Twitter, Instagram, Linkedin, Edit2, Check, X, CircleDot } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});

  useEffect(() => {
    getProfile("me").then((p) => {
      setProfile(p);
      if (p) setForm(p);
    });
  }, []);

  const startEdit = () => {
    setForm(profile || { username: "me" });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await upsertProfile({ username: "me", ...form });
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.display_name || "My Vault";
  const bio = profile?.bio || "Personal research, ideas, and connections.";

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <CircleDot className="h-5 w-5 text-[var(--muted-foreground)]" />
        <span className="text-sm text-[var(--muted-foreground)]">Profile</span>
      </div>

      {/* Cover / Avatar area */}
      <div className="relative mb-6">
        {profile?.cover_url ? (
          <div className="h-36 rounded-xl overflow-hidden">
            <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-36 rounded-xl bg-gradient-to-br from-[var(--secondary)] to-[var(--muted)] border border-[var(--border)]" />
        )}

        {/* Avatar */}
        <div className="absolute -bottom-6 left-6">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover border-4 border-[var(--background)]"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-[var(--card)] border-4 border-[var(--background)] flex items-center justify-center">
              <User className="h-7 w-7 text-[var(--muted-foreground)]" />
            </div>
          )}
        </div>
      </div>

      {/* Name + bio */}
      <div className="mt-8 flex items-start justify-between gap-4">
        {!editing ? (
          <div>
            <h1 className="text-xl font-semibold">{displayName}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-md">{bio}</p>
            {/* Social links */}
            <div className="mt-3 flex items-center gap-3">
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Globe className="h-4 w-4" />
                </a>
              )}
              {profile?.twitter && (
                <a href={`https://x.com/${profile.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {profile?.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {profile?.linkedin && (
                <a href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Display name</label>
              <Input
                value={form.display_name || ""}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="My Vault"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Bio</label>
              <Textarea
                value={form.bio || ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Personal research, ideas, and connections."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Avatar URL</label>
              <Input
                value={form.avatar_url || ""}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Cover URL</label>
              <Input
                value={form.cover_url || ""}
                onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Website</label>
                <Input value={form.website || ""} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://yoursite.com" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Twitter / X</label>
                <Input value={form.twitter || ""} onChange={(e) => setForm((f) => ({ ...f, twitter: e.target.value }))} placeholder="@handle" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Instagram</label>
                <Input value={form.instagram || ""} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">LinkedIn</label>
                <Input value={form.linkedin || ""} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder="username or URL" />
              </div>
            </div>
          </div>
        )}

        {/* Edit / Save / Cancel buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {!editing ? (
            <Button variant="outline" size="sm" onClick={startEdit} className="text-xs">
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} className="text-xs">
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="text-xs">
                <Check className="mr-1 h-3 w-3" /> {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Phase note */}
      {!profile && (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4 text-sm text-[var(--muted-foreground)]">
          <p className="font-medium mb-1">Profile not yet saved</p>
          <p className="text-xs">Run the <code className="bg-[var(--muted)] px-1 py-0.5 rounded text-[10px]">supabase/profiles.sql</code> migration in your Supabase dashboard to enable profile storage.</p>
        </div>
      )}
    </div>
  );
}
