// Нормализатор данных из разных банков
//
// Каждый банк присылает CSV в своём формате:
// разные названия колонок, форматы дат, знаки сумм.
// Этот файл содержит:
// 1. Тип RawTransaction — единый формат после парсинга
// 2. Вспомогательные функции для нормализации дат и сумм

// RawTransaction — промежуточный тип между сырым CSV и Transaction из types/index.ts
// Не содержит id, uploadId, userId — они добавляются при сохранении в БД
export interface RawTransaction {
  date: string;       // ISO 8601: "2026-04-04"
  amount: number;     // отрицательное = расход, положительное = доход
  description: string;
  category: string;   // одна из CATEGORIES из types/index.ts
  merchant?: string;
  rawData?: Record<string, string>; // оригинальная строка CSV для отладки
}

// Преобразует дату из формата DD.MM.YYYY в ISO 8601 (YYYY-MM-DD)
// Пример: "04.04.2026" → "2026-04-04"
// ISO формат нужен для корректной сортировки и сохранения в PostgreSQL (тип date)
export function normalizeDate(dateStr: string): string {
  const [day, month, year] = dateStr.trim().split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Преобразует строку суммы в число с правильным знаком
// isExpense = true → отрицательное число (расход)
// isExpense = false → положительное число (доход/пополнение)
//
// Обрабатывает разные форматы:
// "388.95"    → -388.95 (Альфа, расход)
// "1 500,00"  → -1500   (Тинькофф, расход)
// "-850,00"   → -850    (некоторые форматы уже со знаком)
export function normalizeAmount(amountStr: string, isExpense: boolean): number {
  // Убираем пробелы (разделители тысяч) и заменяем запятую на точку
  const cleaned = amountStr
    .trim()
    .replace(/\s/g, "")   // "1 500,00" → "1500,00"
    .replace(",", ".");    // "1500,00"  → "1500.00"

  const value = Math.abs(parseFloat(cleaned));

  // NaN защита — если не удалось распарсить, возвращаем 0
  if (isNaN(value)) return 0;

  return isExpense ? -value : value;
}

// Определяет банк по структуре заголовков CSV
// Используется в API роуте чтобы выбрать нужный парсер автоматически
export function detectBank(headers: string[]): "tinkoff" | "sber" | "alfa" | null {
  // Уникальные колонки Альфы
  if (headers.includes("operationDate") && headers.includes("merchant")) {
    return "alfa";
  }
  // Уникальные колонки Тинькофф
  if (headers.includes("Дата операции") && headers.includes("MCC")) {
    return "tinkoff";
  }
  // Сбер
  if (headers.includes("Дата") && headers.includes("Подразделение")) {
    return "sber";
  }
  return null;
}
