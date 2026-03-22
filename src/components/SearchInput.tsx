"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SearchInputProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function SearchInput({
  onSearch,
  loading = false,
  placeholder = "Search for a song...",
}: SearchInputProps) {
  const [value, setValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    debouncedSearch(next.trim());
  }

  function handleClear() {
    setValue("");
    onSearch("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }

  return (
    <div className="relative">
      {/* Search icon */}
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-xl bg-zinc-900 py-4 pl-12 pr-12 text-base text-zinc-50 placeholder-zinc-500 outline-none ring-1 ring-zinc-800 transition-all focus:ring-2 focus:ring-[#1DB954]/50"
      />

      {/* Right side: spinner or clear button */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        {loading ? (
          <svg
            className="h-5 w-5 animate-spin text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : value ? (
          <button
            onClick={handleClear}
            className="text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label="Clear search"
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
