import type { PaymentIntentView } from "@/types/shop";

/** Переход на страницу оплаты ЮKassa или сообщение, если checkout не настроен. */
export function applyPaymentIntentResult(
  intent: PaymentIntentView,
  onFallbackMessage: (message: string) => void,
  openExternal?: (url: string) => void,
): boolean {
  if (intent.checkoutUrl) {
    if (openExternal) openExternal(intent.checkoutUrl);
    else window.location.assign(intent.checkoutUrl);
    return true;
  }
  if (intent.message) {
    onFallbackMessage(intent.message);
  }
  return false;
}
