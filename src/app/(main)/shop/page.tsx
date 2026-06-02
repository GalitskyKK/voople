import { ShopPage } from "@/components/shop/ShopPage";

export const revalidate = 300;

export default function ShopRoutePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Магазин</h1>
        <p className="mt-1 text-sm text-white/50">
          Кастомизация профиля, voops и поддержка проекта.
        </p>
      </div>
      <ShopPage />
    </div>
  );
}
