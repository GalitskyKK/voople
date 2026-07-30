"use client";

import { useEffect, useState } from "react";

export function useDebouncedSearchQuery(delay = 300) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      delay,
    );
    return () => window.clearTimeout(timeoutId);
  }, [delay, query]);

  return { query, setQuery, debouncedQuery };
}
