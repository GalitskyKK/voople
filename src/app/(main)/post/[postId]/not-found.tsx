import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="py-16 text-center text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
      <p className="mb-4 text-lg">Пост не найден</p>
      <Link href="/feed" className="text-sm text-[var(--theme-accent)] hover:underline">
        Вернуться в ленту
      </Link>
    </div>
  );
}
