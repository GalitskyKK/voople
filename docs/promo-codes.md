# Промокоды

Таблицы: `promo_codes`, `promo_redemptions`. Миграция: `drizzle/17-promo-codes.sql` (Supabase SQL Editor).

## Типы (`kind`)

| kind | payload | Когда срабатывает |
|------|---------|-------------------|
| `plus_trial` | `{ "days": 7 }` | Сразу по кнопке «Применить» |
| `subscription_discount` | `{ "discountRub": 50 }` | При оплате подписки; списание после webhook |
| `grant_item` | `{ "itemId": "banner-minti" }` | Сразу, предмет в инвентарь |
| `voops_bonus` | `{ "amount": 500 }` | Сразу, начисление voops |

## Создание кода (SQL)

```sql
INSERT INTO public.promo_codes (code, kind, payload, max_redemptions, max_per_user, valid_until, note)
VALUES (
  'MYCODE',
  'plus_trial',
  '{"days":14}'::jsonb,
  100,
  1,
  '2027-01-01T00:00:00Z',
  'Пробные 14 дней'
);
```

`code` хранится в верхнем регистре (пользователь может ввести в любом регистре).

Тестовые коды из миграции: `VOOPLE7` (пробный), `PLUS50`, `PLUS99` (скидка 198 ₽ → **1 ₽** к оплате при цене 199 ₽).

## API

- `shop.applyPromo({ code })` — пробный/бонус/предмет сразу; скидка → preview для checkout.
- `shop.createPaymentIntent({ kind: "subscription", promoCode? })` — оплата с учётом скидки.

## Подписка

- **199 ₽ / 30 дней**, разовая оплата, **без автопродления** (`VOOPLUS_IS_RECURRING = false`).
- Повторная оплата вручную продлевает срок от `expires_at`.
