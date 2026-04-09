// src/lib/parsers/index.ts
// Точка входа для всех парсеров.
//
// Экспортируем всё из одного места чтобы в API роуте делать просто:
//   import { parseCSV } from "@/lib/parsers"
// а не импортировать из каждого файла отдельно.

export { parseAlfa } from "./alfa";
export { parseTinkoff } from "./tinkoff";
export { parseSber } from "./sber";
export { detectBank, normalizeDate, normalizeAmount } from "./normalize";
export type { RawTransaction } from "./normalize";

// Импортируем всё что нужно для функции-обёртки
import { detectBank } from "./normalize";
import { parseAlfa } from "./alfa";
import { parseTinkoff } from "./tinkoff";
import { parseSber } from "./sber";
import type { Transaction, Bank } from "@/types";

// Результат парсинга — банк + массив транзакций
interface ParseResult {
  bank: Bank;
  transactions: Transaction[];
}

// parseCSV — универсальная функция-обёртка.
// Принимает ArrayBuffer (сырые байты файла) и имя файла,
// сама определяет банк и вызывает нужный парсер.
// Используется в API route /api/parse-csv.
export async function parseCSV(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ParseResult> {
  // Декодируем байты в строку.
  // Альфа и Тинькофф — UTF-8, Сбер — Windows-1251.
  // detectBank поможет понять какой банк, но для Сбера нужен особый декодер.
  // Сначала пробуем UTF-8 (подходит для Альфы и Тинькова).
  const utf8Text = new TextDecoder("utf-8").decode(buffer);

  // Определяем банк по заголовкам CSV.
  // detectBank анализирует первую строку файла.
  const bank = detectBank(utf8Text);

  if (bank === "sber") {
    // Сбер использует Windows-1251 — перекодируем
    const sberText = new TextDecoder("windows-1251").decode(buffer);
    const transactions = parseSber(sberText, "placeholder-upload-id");
    return { bank, transactions };
  }

  if (bank === "alfa") {
    const transactions = parseAlfa(utf8Text, "placeholder-upload-id");
    return { bank, transactions };
  }

  if (bank === "tinkoff") {
    const transactions = parseTinkoff(utf8Text, "placeholder-upload-id");
    return { bank, transactions };
  }

  // Если банк не определён — бросаем ошибку с понятным сообщением
  throw new Error(
    `Не удалось определить банк по заголовкам файла "${fileName}". ` +
    `Поддерживаются: Альфа-Банк, Тинькофф, Сбер.`
  );
}
