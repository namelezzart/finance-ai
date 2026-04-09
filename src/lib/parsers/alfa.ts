// Парсер выписки Альфа-банка (мобильное приложение)
//
// Формат файла:
// - Кодировка: UTF-8 с BOM (﻿) — BOM автоматически убирается при чтении
// - Разделитель: запятая (,)
// - Заголовок: первая строка
// - Дата: DD.MM.YYYY
// - Сумма: всегда положительное число
// - Направление: поле "type" — "Списание" = расход, "Пополнение" = доход
//
// Колонки:
// operationDate, transactionDate, accountName, accountNumber,
// cardName, cardNumber, merchant, amount, currency, status,
// category, mcc, type, comment, bonusValue, bonusTitle

import Papa from "papaparse";
import { normalizeDate, normalizeAmount } from "./normalize";
import type { RawTransaction } from "./normalize";

// Тип одной строки CSV от Альфы
// Все поля — строки, потому что CSV не знает типов
interface AlfaRow {
  operationDate: string;   // дата операции: "04.04.2026"
  transactionDate: string; // дата обработки банком (может отличаться)
  accountName: string;     // название счёта: "Текущий счёт"
  accountNumber: string;   // номер счёта
  cardName: string;        // название карты: "Апельсиновая карта"
  cardNumber: string;      // маскированный номер карты
  merchant: string;        // название магазина / получателя
  amount: string;          // сумма: "388.95" (всегда положительная)
  currency: string;        // валюта: "RUR"
  status: string;          // статус: "Выполнен" или ""
  category: string;        // категория от банка: "Продукты", "Транспорт"...
  mcc: string;             // MCC-код (код типа торговой точки)
  type: string;            // тип: "Списание" или "Пополнение"
  comment: string;
  bonusValue: string;
  bonusTitle: string;
}

// Маппинг категорий Альфы → наши внутренние категории
// Альфа уже присылает категории на русском, переводим в наш формат
const CATEGORY_MAP: Record<string, string> = {
  "Продукты": "food_groceries",
  "Супермаркеты": "food_groceries",
  "Фастфуд": "food_restaurants",
  "Рестораны": "food_restaurants",
  "Транспорт": "transport_public",
  "Такси": "transport_taxi",
  "АЗС": "transport_fuel",
  "Связь, интернет и ТВ": "housing_utilities",
  "ЖКХ": "housing_utilities",
  "Аптеки": "health_pharmacy",
  "Медицина": "health_services",
  "Кино и развлечения": "entertainment_leisure",
  "Подписки": "entertainment_streaming",
  "Одежда и обувь": "shopping_clothes",
  "Электроника": "shopping_electronics",
  "Образование": "education",
  "Путешествия": "travel",
  "Финансовые операции": "transfers",
  "Выдача наличных": "transfers",
  "Внесение наличных": "income",
  "Прочие расходы": "other",
};

export function parseAlfa(csvText: string): RawTransaction[] {
  // Papa.parse — библиотека для парсинга CSV
  // header: true — первая строка используется как имена полей
  // skipEmptyLines — пропускаем пустые строки
  const result = Papa.parse<AlfaRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    // BOM убирается автоматически благодаря этой опции
    transformHeader: (h) => h.trim(),
  });

  // Фильтруем только успешные операции
  // Пропускаем незавершённые транзакции (status пустой = в обработке)
  return result.data
    .filter((row) => row.merchant && row.amount)
    .map((row): RawTransaction => {
      // Определяем знак суммы:
      // "Списание" → отрицательная (расход)
      // "Пополнение" → положительная (доход)
      const isExpense = row.type === "Списание";
      const amount = normalizeAmount(row.amount, isExpense);

      // Маппим категорию банка в нашу, если нет — "other"
      const category = CATEGORY_MAP[row.category] ?? "other";

      return {
        date: normalizeDate(row.operationDate),
        amount,
        description: row.merchant,
        category,
        merchant: row.merchant,
        rawData: row as unknown as Record<string, string>,
      };
    });
}
