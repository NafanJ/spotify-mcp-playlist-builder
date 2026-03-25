const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID ?? "").trim();
const CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET ?? "").trim();
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI?.trim() ?? "";

// Client credentials flow for public search (no user auth needed)
let clientToken: { access_token: string; expires_at: number } | null = null;

async function getClientToken(): Promise<string> {
  if (clientToken && Date.now() < clientToken.expires_at) {
    return clientToken.access_token;
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }

  const data = await res.json();
  clientToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  return clientToken.access_token;
}

export async function searchTracks(
  query: string,
  limit = 10
): Promise<SpotifySearchResult> {
  const token = await getClientToken();
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
  });

  const res = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify search failed: ${res.status}`);
  }

  return res.json();
}

interface SpotifySearchResult {
  tracks: {
    items: SpotifyApiTrack[];
    total: number;
  };
}

interface SpotifyApiTrack {
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

// Refresh an admin's Spotify access token
export async function refreshAdminToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status}`);
  }

  return res.json();
}

// Add a track to a playlist using admin's token
export async function addTrackToPlaylist(
  accessToken: string,
  playlistId: string,
  spotifyUri: string
): Promise<void> {
  const res = await fetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [spotifyUri] }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to add track to playlist: ${res.status} ${error}`);
  }
}

// Generate the Spotify OAuth URL for admin login
export function getSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID!,
    scope:
      "playlist-modify-public playlist-modify-private playlist-read-private user-read-private user-read-email",
    redirect_uri: REDIRECT_URI,
    state,
    show_dialog: "true",
  });

  return `https://accounts.spotify.com/authorize?${params}`;
}

// Exchange authorization code for tokens
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify code exchange failed: ${res.status}`);
  }

  return res.json();
}

// Create a new Spotify playlist
export async function createSpotifyPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description?: string
): Promise<{ id: string; external_urls: { spotify: string } }> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description: description || "",
      public: true,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create playlist: ${res.status} ${error}`);
  }

  return res.json();
}

// Get current user's Spotify profile
export async function getSpotifyProfile(
  accessToken: string
): Promise<{ id: string; display_name: string }> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify profile fetch failed: ${res.status}`);
  }

  return res.json();
}
