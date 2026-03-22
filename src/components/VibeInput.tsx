"use client";

import { useState } from "react";

interface VibeInputProps {
  onSubmit: (prompt: string) => void;
  loading?: boolean;
}

export default function VibeInput({ onSubmit, loading = false }: VibeInputProps) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="something for a 2am walk home..."
        rows={3}
        disabled={loading}
        className="w-full resize-none rounded-xl bg-zinc-900 p-4 text-base text-zinc-50 placeholder-zinc-500 outline-none ring-1 ring-zinc-800 transition-all focus:ring-2 focus:ring-[#1DB954]/50 disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={!prompt.trim() || loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#1DB954] py-3.5 text-sm font-bold text-black transition-colors hover:bg-[#1ed760] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span>Finding vibes</span>
            <LoadingDots />
          </>
        ) : (
          "Find songs for this vibe"
        )}
      </button>
    </form>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="animate-bounce text-black [animation-delay:0ms]">.</span>
      <span className="animate-bounce text-black [animation-delay:150ms]">.</span>
      <span className="animate-bounce text-black [animation-delay:300ms]">.</span>
    </span>
  );
}
