// Парсер выписки Сбербанка
//
// Формат файла:
// - Кодировка: Windows-1251 → нужно конвертировать в UTF-8 при чтении
// - Разделитель: точка с запятой (;)
// - Заголовок: первая строка
// - Дата: DD.MM.YYYY
// - Сумма: знаковое число, "-500.00" = расход
//
// ВАЖНО: браузер не умеет читать Windows-1251 напрямую.
// Конвертация происходит на сервере через TextDecoder с encoding "windows-1251"

import Papa from "papaparse";
import { normalizeDate, normalizeAmount } from "./normalize";
import type { RawTransaction } from "./normalize";

interface SberRow {
  "Дата операции": string;      // "15.03.2024"
  "Дата обработки": string;
  "Описание операции": string;  // название магазина
  "Категория": string;
  "Сумма операции": string;     // "-500.00"
  "Валюта": string;
  "Подразделение": string;      // уникальная колонка Сбера для определения банка
}

const CATEGORY_MAP: Record<string, string> = {
  "Супермаркеты и продукты питания": "food_groceries",
  "Рестораны и кафе": "food_restaurants",
  "Транспорт": "transport_public",
  "Такси": "transport_taxi",
  "Автозаправки": "transport_fuel",
  "Коммунальные платежи": "housing_utilities",
  "Аптеки": "health_pharmacy",
  "Медицина": "health_services",
  "Развлечения": "entertainment_leisure",
  "Одежда и обувь": "shopping_clothes",
  "Электроника": "shopping_electronics",
  "Образование": "education",
  "Путешествия": "travel",
  "Переводы": "transfers",
  "Прочее": "other",
};

export function parseSber(csvText: string): RawTransaction[] {
  const result = Papa.parse<SberRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
    transformHeader: (h) => h.trim(),
  });

  return result.data
    .filter((row) => row["Описание операции"] && row["Сумма операции"])
    .map((row): RawTransaction => {
      const amountStr = row["Сумма операции"];
      const isExpense = amountStr.trim().startsWith("-");
      const amount = normalizeAmount(amountStr, isExpense);
      const category = CATEGORY_MAP[row["Категория"]] ?? "other";

      return {
        date: normalizeDate(row["Дата операции"]),
        amount,
        description: row["Описание операции"],
        category,
        merchant: row["Описание операции"],
        rawData: row as unknown as Record<string, string>,
      };
    });
}
