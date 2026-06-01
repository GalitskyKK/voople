type ProfileStatsProps = {
  posts: number;
  followers: number;
  following: number;
  views: number;
};

export function ProfileStats({ posts, followers, following, views }: ProfileStatsProps) {
  return (
    <div className="flex gap-4 text-sm text-white/70">
      <span>
        <strong className="text-white">{posts}</strong> постов
      </span>
      <span>
        <strong className="text-white">{followers}</strong> подписчиков
      </span>
      <span>
        <strong className="text-white">{following}</strong> подписок
      </span>
      <span>
        <strong className="text-white">{views}</strong> просмотров
      </span>
    </div>
  );
}
