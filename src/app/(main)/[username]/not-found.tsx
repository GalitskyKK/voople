import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 p-12 text-center">
      <p className="text-lg text-white/80">Профиль не найден</p>
      <Link href="/feed" className="voople-link hover:underline">
        На ленту
      </Link>
    </div>
  );
}
