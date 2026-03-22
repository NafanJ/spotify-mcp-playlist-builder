export interface PlaylistEvent {
  id: string;
  title: string;
  slug: string;
  spotify_playlist_id: string | null;
  description: string | null;
  theme: string | null;
  cover_image_url: string | null;
  is_open: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  playlist_event_id: string;
  spotify_track_id: string;
  spotify_uri: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  artwork_url: string | null;
  preview_url: string | null;
  submitted_by_name: string | null;
  submitted_by_fingerprint: string | null;
  note: string | null;
  source: "search" | "vibe";
  vibe_prompt: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  duplicate_of_submission_id: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface AdminSpotifyConnection {
  id: string;
  user_id: string;
  spotify_user_id: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
