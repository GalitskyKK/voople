import type { ReactNode } from "react";

export function ShopPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full px-1 py-4 sm:px-3 lg:px-5 lg:py-5">
      {children}
    </div>
  );
}
