"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Submission, PlaylistEvent } from "@/lib/types";
import TrackCard from "@/components/TrackCard";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const [event, setEvent] = useState<PlaylistEvent | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [loading, setLoading] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

    // Load first event created by this admin
    const { data: events } = await supabase
      .from("playlist_events")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (events && events.length > 0) {
      setEvent(events[0]);

      // Load submissions
      const { data: subs } = await supabase
        .from("submissions")
        .select("*")
        .eq("playlist_event_id", events[0].id)
        .eq("status", filter)
        .order("created_at", { ascending: false });

      setSubmissions((subs as Submission[]) || []);
    }
    setLoading(false);
  }, [supabase, router, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApprove(submissionId: string) {
    const res = await fetch(`/api/admin/submissions/${submissionId}/approve`, {
      method: "POST",
    });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    }
  }

  async function handleReject(submissionId: string) {
    const res = await fetch(`/api/admin/submissions/${submissionId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Not a good fit" }),
    });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    }
  }

  async function handleToggleEvent() {
    if (!event) return;
    const res = await fetch("/api/admin/event/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: event.id, is_open: !event.is_open }),
    });
    if (res.ok) {
      setEvent({ ...event, is_open: !event.is_open });
    }
  }

  async function connectSpotify() {
    window.location.href = `/api/auth/spotify`;
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
        <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>

        {!spotifyConnected && (
          <button
            onClick={connectSpotify}
            className="w-full py-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold transition-colors mb-4"
          >
            Connect Spotify Account
          </button>
        )}

        {event ? (
          <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{event.title}</h2>
                {event.theme && (
                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                    {event.theme}
                  </span>
                )}
              </div>
              <button
                onClick={handleToggleEvent}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  event.is_open
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                }`}
              >
                {event.is_open ? "Close" : "Open"}
              </button>
            </div>
            <p className="text-zinc-400 text-sm">
              /event/{event.slug}
            </p>
          </div>
        ) : (
          <p className="text-zinc-400">
            No playlist event found. Create one in Supabase.
          </p>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2 mb-4">
          {(["pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                filter === status
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {submissions.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">
              No {filter} submissions
            </p>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="bg-zinc-900 rounded-xl p-3">
                <TrackCard track={sub} showStatus />
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
                {filter === "pending" && (
                  <div className="flex gap-2 mt-3 ml-16">
                    <button
                      onClick={() => handleApprove(sub.id)}
                      className="flex-1 py-2 rounded-lg bg-[#1DB954]/20 text-[#1DB954] font-semibold text-sm hover:bg-[#1DB954]/30 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(sub.id)}
                      className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
