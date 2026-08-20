import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import type { PostMediaUploadsController } from "@/hooks/usePostMediaUploads";
import type { PostDraftView } from "@/types/domain";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function useDesktopCloudPostDraft(config: DesktopConfig, session: Session, text: string, setText: (value: string) => void, uploads: PostMediaUploadsController) {
  const [active, setActive] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);
  const lastSaved = useRef("");
  const client = useRef(createDesktopTrpcClient(config, () => session.access_token));
  const { media, restore } = uploads;

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      client.current.query("shop.subscriptionStatus"),
      client.current.query("post.draft"),
    ]).then(([status, value]) => {
      if (!mounted) return;
      const hasPlus = Boolean((status as { active?: boolean }).active);
      setActive(hasPlus);
      const draft = value as PostDraftView | null;
      if (hasPlus && draft) {
        setText(draft.text);
        restore(draft.media);
        setRevision(draft.revision);
        lastSaved.current = JSON.stringify({
          text: draft.text,
          media: draft.media.map(({ url, ...item }) => {
            void url;
            return item;
          }),
        });
      }
      restored.current = true;
    }).catch(() => { restored.current = true; });
    return () => { mounted = false; };
  }, [restore, setText]);

  const signature = JSON.stringify({ text, media });
  useEffect(() => {
    if (!active || !restored.current || saving || signature === lastSaved.current || (!text.trim() && !media.length)) return;
    const timer = window.setTimeout(() => {
      setSaving(true); setError(null);
      void client.current.mutation("post.saveDraft", { text, media, expectedRevision: revision })
        .then((value) => {
          const draft = value as PostDraftView;
          setRevision(draft.revision);
          lastSaved.current = signature;
        })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Не удалось сохранить черновик"))
        .finally(() => setSaving(false));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [active, media, revision, saving, signature, text]);

  const clear = async () => {
    setRevision(0); lastSaved.current = "";
    if (active) await client.current.mutation("post.deleteDraft").catch(() => undefined);
  };
  return { active, saving, error, clear };
}
