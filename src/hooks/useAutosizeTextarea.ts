import { useEffect, useRef } from "react";

export function useAutosizeTextarea(value: string, maxHeight = 128) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [maxHeight, value]);
  return ref;
}
