import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { MERCHANT } from "@/lib/constants/legal";

export const metadata: Metadata = {
  title: "Контакты и реквизиты — Voople",
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
          <a href="/legal/services">Услуги и цены</a>
        </li>
        <li>
          <a href="/legal/delivery">Получение заказа</a>
        </li>
        <li>
          <a href="/legal/offer">Публичная оферта</a>
        </li>
        <li>
          <a href="/legal/terms">Условия использования</a>
        </li>
      </ul>
    </LegalDocument>
  );
}
