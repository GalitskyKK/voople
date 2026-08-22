"use client";

import { useEffect, useState } from "react";

export function useDebouncedSearchQuery(delay = 300, initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery.trim());

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      delay,
    );
    return () => window.clearTimeout(timeoutId);
  }, [delay, query]);

  return { query, setQuery, debouncedQuery };
}
