import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { MERCHANT } from "@/lib/constants/legal";

export const metadata: Metadata = {
  title: "Контакты и реквизиты",
  description: "Контактная информация и реквизиты исполнителя Voople.",
};

export default function LegalContactsPage() {
  return (
    <LegalDocument title="Контакты и реквизиты">
      <h2>Исполнитель</h2>
      <dl className="voople-legal__dl">
        <div>
          <dt>ФИО</dt>
          <dd>{MERCHANT.fullName}</dd>
        </div>
        <div>
          <dt>ИНН</dt>
          <dd>{MERCHANT.inn}</dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{MERCHANT.status}</dd>
        </div>
        <div>
          <dt>Сервис</dt>
          <dd>
            <a href={MERCHANT.siteUrl}>{MERCHANT.serviceName}</a>
          </dd>
        </div>
      </dl>

      <h2>Контакты</h2>
      <dl className="voople-legal__dl">
        <div>
          <dt>E-mail</dt>
          <dd>
            <a href={`mailto:${MERCHANT.email}`}>{MERCHANT.email}</a>
          </dd>
        </div>
      </dl>
      <p>
        По этому адресу можно задать вопросы об оплате, получении цифровых товаров, возврате средств при
        техническом сбое и работе сервиса. Срок ответа — до 3 рабочих дней.
      </p>

      <h2>Документы</h2>
      <ul>
        <li>
          <Link href="/legal/services">Услуги и цены</Link>
        </li>
        <li>
          <Link href="/legal/delivery">Получение заказа</Link>
        </li>
        <li>
          <Link href="/legal/offer">Публичная оферта</Link>
        </li>
        <li>
          <Link href="/legal/terms">Условия использования</Link>
        </li>
      </ul>
    </LegalDocument>
  );
}
