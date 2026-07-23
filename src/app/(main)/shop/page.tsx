import { ShopPage } from "@/components/shop/ShopPage";

export const revalidate = 300;

export default function ShopRoutePage() {
  return (
    <div className="mx-auto w-full px-1 py-4 sm:px-3 lg:px-5 lg:py-5">
      <ShopPage />
    </div>
  );
}
