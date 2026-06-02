export type YooKassaCredentials = {
  shopId: string;
  secretKey: string;
};

/** Поддерживает YOO_KASSA_* (env.local) и YOOKASSA_* из docs. */
export function getYooKassaCredentials(): YooKassaCredentials | null {
  const shopId =
    process.env.YOO_KASSA_SHOP_ID?.trim() || process.env.YOOKASSA_SHOP_ID?.trim() || "";
  const secretKey =
    process.env.YOO_KASSA_SECRET_KEY?.trim() || process.env.YOOKASSA_SECRET_KEY?.trim() || "";

  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

export function isYooKassaConfigured(): boolean {
  return getYooKassaCredentials() !== null;
}
