import { trpc } from "@/lib/trpc/client";
import type { ProfileViewModel } from "@/types/domain";
import { ProfileAppearanceCard } from "./ProfileAppearanceCard";
import { ProfileShareController } from "./ProfileShareController";

export function ProfileShareCardButton({
  profile,
}: {
  profile: ProfileViewModel;
}) {
  const utils = trpc.useUtils();
  const publish = trpc.post.create.useMutation();
  const profileUrl =
    typeof window === "undefined"
      ? `https://voople.ru/${profile.username}`
      : `${window.location.origin}/${profile.username}`;

  return (
    <ProfileShareController
      displayName={profile.displayName}
      profileUrl={profileUrl}
      renderPreview={(scene) => (
        <ProfileAppearanceCard
          profile={profile}
          scene={scene}
          className="max-w-[25rem]"
        />
      )}
      publish={async ({ caption, scene }) => {
        await publish.mutateAsync({ text: caption || undefined, appearanceScene: scene });
        await Promise.all([
          utils.feed.getPage.invalidate(),
          utils.profile.getPostsByUsername.invalidate({ username: profile.username }),
        ]);
      }}
      publishError={publish.error?.message}
    />
  );
}
