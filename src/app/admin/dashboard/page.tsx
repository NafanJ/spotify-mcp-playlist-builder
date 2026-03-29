"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Submission, PlaylistEvent } from "@/lib/types";
import TrackCard from "@/components/TrackCard";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<PlaylistEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }

    // Check Spotify connection
    const { data: spotifyConn } = await supabase
      .from("admin_spotify_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();
    setSpotifyConnected(!!spotifyConn);

    // Load all events created by this admin
    const { data: allEvents } = await supabase
      .from("playlist_events")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    const eventList = (allEvents as PlaylistEvent[]) || [];
    setEvents(eventList);

    // Auto-select first event if none selected
    setSelectedEventId((prev) => {
      if (prev && eventList.some((e) => e.id === prev)) return prev;
      return eventList[0]?.id ?? null;
    });

    setLoading(false);

    // Sync cover art from Spotify in the background
    if (spotifyConn) {
      fetch("/api/admin/event/sync-covers", { method: "POST" }).then(async (res) => {
        if (res.ok) {
          const { updated } = await res.json();
          if (updated > 0) {
            // Reload events with fresh covers
            const { data: refreshed } = await supabase
              .from("playlist_events")
              .select("*")
              .eq("created_by", user.id)
              .order("created_at", { ascending: false });
            if (refreshed) setEvents(refreshed as PlaylistEvent[]);
          }
        }
      });
    }
  }, [supabase, router]);

  // Load submissions when selected event changes
  useEffect(() => {
    if (!selectedEventId) {
      setSubmissions([]);
      return;
    }
    async function loadSubmissions() {
      const { data: subs } = await supabase
        .from("submissions")
        .select("*")
        .eq("playlist_event_id", selectedEventId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setSubmissions((subs as Submission[]) || []);
    }
    loadSubmissions();
  }, [selectedEventId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleEvent() {
    if (!selectedEvent) return;
    const res = await fetch("/api/admin/event/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: selectedEvent.id,
        is_open: !selectedEvent.is_open,
      }),
    });
    if (res.ok) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === selectedEvent.id ? { ...e, is_open: !e.is_open } : e
        )
      );
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Delete this event and all its submissions?")) return;
    const res = await fetch(`/api/admin/event/${eventId}/delete`, {
      method: "DELETE",
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
        setSubmissions([]);
      }
    }
  }

  async function connectSpotify() {
    window.location.href = `/api/auth/spotify`;
  }

  // Create event form state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTheme, setNewTheme] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/admin/event/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        slug: newSlug,
        description: newDescription || null,
        theme: newTheme || null,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = "Failed to create event";
      try {
        const data = JSON.parse(text);
        msg = data.error || msg;
      } catch {
        msg = text || msg;
      }
      setCreateError(msg);
      setCreating(false);
      return;
    }

    setShowCreate(false);
    setNewTitle("");
    setNewSlug("");
    setNewDescription("");
    setNewTheme("");
    setCreating(false);
    loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 py-6 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <a
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            View app →
          </a>
        </div>

        {!spotifyConnected && (
          <button
            onClick={connectSpotify}
            className="w-full py-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold transition-colors mb-4"
          >
            Connect Spotify Account
          </button>
        )}

        {/* Event list */}
        {events.length > 0 && (
          <div className="space-y-2 mb-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelectedEventId(ev.id)}
                className={`bg-zinc-900 rounded-xl p-4 cursor-pointer transition-colors border ${
                  selectedEventId === ev.id
                    ? "border-[#1DB954]"
                    : "border-transparent hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {ev.cover_image_url ? (
                      <img
                        src={ev.cover_image_url}
                        alt={ev.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 shrink-0 flex items-center justify-center">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-zinc-600">
                          <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            ev.is_open ? "bg-green-500" : "bg-zinc-600"
                          }`}
                        />
                        <h2 className="text-sm font-bold text-white truncate">
                          {ev.title}
                        </h2>
                      </div>
                      {ev.theme && (
                        <span className="text-xs text-zinc-500 ml-4">
                          {ev.theme}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {selectedEventId === ev.id && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEvent();
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            ev.is_open
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                        >
                          {ev.is_open ? "Close" : "Open"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(ev.id);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <a
                    href={`/event/${ev.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-zinc-500 text-xs hover:text-[#1DB954] transition-colors inline-flex items-center gap-1"
                  >
                    /event/{ev.slug}
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                  <a
                    href={`/api/event/${ev.slug}/card`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${ev.slug}-story.png`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-[#1DB954] hover:text-[#1ed760] transition-colors inline-flex items-center gap-1 font-medium"
                  >
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Story card
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create event */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 border-dashed text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            + Create Playlist Event
          </button>
        ) : (
          <form
            onSubmit={handleCreateEvent}
            className="bg-zinc-900 rounded-xl p-4 space-y-3"
          >
            <input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                setNewSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/-$/, "")
                );
              }}
              placeholder="Playlist title"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] text-sm"
              required
            />
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="URL slug (e.g. tonight)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] text-sm"
              required
            />
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] text-sm"
            />
            <input
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              placeholder="Theme (optional, e.g. Late night drive)"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] text-sm"
            />
            {createError && (
              <p className="text-red-400 text-sm">{createError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Event"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Playlist for selected event */}
      {selectedEvent && (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400">
              Playlist — {selectedEvent.title}
            </h3>
            {selectedEvent.spotify_playlist_id && (
              <a
                href={`https://open.spotify.com/playlist/${selectedEvent.spotify_playlist_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1DB954]/10 text-[#1DB954] text-xs font-semibold hover:bg-[#1DB954]/20 transition-colors"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Open in Spotify
              </a>
            )}
          </div>

          <div className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No songs yet</p>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="bg-zinc-900 rounded-xl p-3">
                  <TrackCard track={sub} compact />
                  {sub.submitted_by_name && (
                    <p className="text-zinc-500 text-xs mt-1 ml-16">
                      from {sub.submitted_by_name}
                    </p>
                  )}
                  {sub.note && (
                    <p className="text-zinc-400 text-xs mt-1 ml-16 italic">
                      &ldquo;{sub.note}&rdquo;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
