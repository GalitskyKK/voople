import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { MERCHANT } from "@/lib/constants/legal";
import { VOOPLUS_PERIOD_DAYS, VOOPLUS_PRICE_RUB } from "@/lib/constants/subscription";
import { SHOP_CATALOG, type ShopCatalogItem, type ShopItemKind } from "@/lib/shop/catalog";

export const metadata: Metadata = {
  title: "Услуги и цены",
  description: "Цифровые товары и услуги Voople с фиксированными ценами в рублях.",
};

const KIND_LABELS: Record<ShopItemKind, string> = {
  profile_frame: "Рамка карточки профиля",
  effect: "Эффект профиля",
  ring: "Кольцо аватара",
  banner: "Баннер профиля",
  profile_background: "Фон карточки",
  nameplate: "Стиль имени",
  badge: "Бейдж",
  reaction_pack: "Набор реакций",
  decoration: "Декорация аватара",
  feed_card: "Стиль карточки в ленте",
  animated_avatar: "Анимированный аватар",
  app_theme: "Тема приложения",
  nickname_style: "Стиль никнейма",
};

const DONATION_PRESETS = [100, 300, 500] as const;

function formatRub(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

function ServiceRow({ item }: { item: ShopCatalogItem }) {
  return (
    <tr>
      <td>{item.name}</td>
      <td>{KIND_LABELS[item.kind]}</td>
      <td>{item.description}</td>
      <td className="whitespace-nowrap font-medium">{formatRub(item.priceRub)}</td>
    </tr>
  );
}

export default function LegalServicesPage() {
  const paidItems = SHOP_CATALOG.filter((item) => item.priceRub > 0).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <LegalDocument title="Услуги и цены">
      <p>
        На сайте {MERCHANT.serviceName} ({MERCHANT.siteUrl}) принимается оплата за цифровые товары и услуги,
        связанные с кастомизацией профиля и поддержкой проекта. Все цены указаны в российских рублях и являются
        фиксированными на момент оформления заказа.
      </p>

      <h2>Подписка Voople+</h2>
      <p>
        Подписка даёт доступ к загрузке и рисованию собственного баннера профиля и отображает бейдж Voople+.
        Срок действия — {VOOPLUS_PERIOD_DAYS} календарных дней с момента успешной оплаты. Повторная оплата
        продлевает срок от текущей даты окончания, если подписка ещё активна.
      </p>
      <p className="font-medium">
        Стоимость: {formatRub(VOOPLUS_PRICE_RUB)} за {VOOPLUS_PERIOD_DAYS} дней. Разовая оплата, без автопродления.
        Промокоды могут давать пробный период или скидку (см. условия акции).
      </p>

      <h2>Цифровые товары для профиля</h2>
      <p>
        Предметы магазина — это цифровые активы: темы, эффекты, баннеры, декорации аватара и другие
        элементы оформления профиля и интерфейса. После оплаты предмет зачисляется в инвентарь аккаунта и
        становится доступен для экипировки в разделе{" "}
        <Link href="/shop">«Магазин»</Link>.
      </p>

      <div className="voople-legal__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Тип</th>
              <th>Описание</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {paidItems.map((item) => (
              <ServiceRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm">
        Отдельные позиции могут временно предоставляться бесплатно в рамках промо-сезона. При платной покупке
        применяется цена из таблицы выше.
      </p>

      <h2>Добровольная поддержка проекта</h2>
      <p>
        Пользователь может оформить добровольный донат в пользу развития сервиса. Доступные суммы:{" "}
        {DONATION_PRESETS.map(formatRub).join(", ")}. Донат не является предоплатой за конкретный цифровой
        товар и не обязывает исполнителя предоставить материальное вознаграждение.
      </p>

      <h2>Способ оплаты</h2>
      <p>
        Оплата производится через платёжный сервис ЮKassa (банковские карты и иные способы, доступные на
        странице оплаты). Моментом оплаты считается успешное подтверждение платежа платёжным сервисом.
      </p>
    </LegalDocument>
  );
}
