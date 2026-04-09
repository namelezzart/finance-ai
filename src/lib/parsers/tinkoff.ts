// Парсер выписки Тинькофф (веб + мобильное приложение)
//
// Формат файла:
// - Кодировка: UTF-8 с BOM
// - Разделитель: точка с запятой (;)
// - Заголовок: первая строка
// - Дата: DD.MM.YYYY HH:MM:SS
// - Сумма: отрицательная для расходов, например "-1 500,00"
//
// Колонки:
// Дата операции, Дата платежа, Номер карты, Статус, Сумма операции,
// Валюта операции, Сумма платежа, Валюта платежа, Кэшбэк, Категория,
// MCC, Описание, Бонусы, Округление, Сумма операции с округлением

import Papa from "papaparse";
import { normalizeDate, normalizeAmount } from "./normalize";
import type { RawTransaction } from "./normalize";

interface TinkoffRow {
  "Дата операции": string;    // "15.03.2024 14:32:10"
  "Дата платежа": string;
  "Номер карты": string;
  "Статус": string;           // "OK" или "FAILED"
  "Сумма операции": string;   // "-1 500,00" или "5 000,00"
  "Валюта операции": string;
  "Сумма платежа": string;
  "Валюта платежа": string;
  "Кэшбэк": string;
  "Категория": string;        // "Супермаркеты", "Рестораны"...
  "MCC": string;
  "Описание": string;         // название магазина
  "Бонусы (включая кэшбэк)": string;
  "Округление на вклад": string;
  "Сумма операции с округлением": string;
}

const CATEGORY_MAP: Record<string, string> = {
  "Супермаркеты": "food_groceries",
  "Продукты": "food_groceries",
  "Рестораны": "food_restaurants",
  "Кафе и рестораны": "food_restaurants",
  "Транспорт": "transport_public",
  "Такси": "transport_taxi",
  "АЗС": "transport_fuel",
  "Коммунальные услуги": "housing_utilities",
  "Аптеки": "health_pharmacy",
  "Медицина": "health_services",
  "Кино": "entertainment_leisure",
  "Развлечения": "entertainment_leisure",
  "Подписки": "entertainment_streaming",
  "Одежда и обувь": "shopping_clothes",
  "Электроника": "shopping_electronics",
  "Образование": "education",
  "Путешествия": "travel",
  "Переводы": "transfers",
  "Наличные": "transfers",
  "Пополнения": "income",
};

export function parseTinkoff(csvText: string): RawTransaction[] {
  const result = Papa.parse<TinkoffRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    // Тинькофф использует точку с запятой как разделитель
    delimiter: ";",
    transformHeader: (h) => h.trim(),
  });

  return result.data
    // Пропускаем отменённые операции
    .filter((row) => row["Статус"] === "OK" && row["Сумма операции"])
    .map((row): RawTransaction => {
      const amountStr = row["Сумма операции"];

      // В Тинькофф сумма уже со знаком:
      // отрицательная = расход, положительная = доход
      const isExpense = amountStr.trim().startsWith("-");
      const amount = normalizeAmount(amountStr, isExpense);

      // Дата содержит время: "15.03.2024 14:32:10" — берём только дату
      const dateOnly = row["Дата операции"].split(" ")[0];

      const category = CATEGORY_MAP[row["Категория"]] ?? "other";

      return {
        date: normalizeDate(dateOnly),
        amount,
        description: row["Описание"],
        category,
        merchant: row["Описание"],
        rawData: row as unknown as Record<string, string>,
      };
    });
}
