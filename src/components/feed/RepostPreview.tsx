import { PostMedia } from "@/components/media/PostMedia";
import { PostMediaGallery } from "@/components/media/PostMediaGallery";
import { ProfileAppearanceCard } from "@/components/profile/ProfileAppearanceCard";
import type { PostViewModel } from "@/types/domain";
import { StatusPostBody } from "./StatusPostBody";
import { RepostPreviewVisual } from "./RepostPreviewVisual";

export function RepostPreview({
  post,
  depth = 0,
}: {
  post: PostViewModel;
  depth?: number;
}) {
  return (
    <RepostPreviewVisual
      post={post}
      depth={depth}
      renderMedia={(item) => (
        item.media?.length ? (
          <PostMediaGallery post={item} className="mt-3" />
        ) : (
          <PostMedia url={item.mediaUrl!} mediaType={item.mediaType} className="mt-3" />
        )
      )}
      renderAppearance={(item, customization) => (
        <ProfileAppearanceCard
          profile={{
            id: item.author.id,
            username: item.author.username,
            displayName: item.author.displayName,
            customization,
            status: item.appearance?.status ?? {},
            badgeIds: item.appearance?.badgeIds,
          }}
          scene={item.appearance!.scene}
          variant="feed"
          className="mt-3"
        />
      )}
      renderStatus={(item, status) => (
        <StatusPostBody
          status={status}
          authorUsername={item.author.username}
          className={item.text ? "mt-3" : undefined}
        />
      )}
    />
  );
}
