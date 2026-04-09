// Точка входа для всех парсеров
//
// Экспортируем всё из одного места чтобы в API роуте
// делать просто: import { parseAlfa, parseTinkoff, detectBank } from "@/lib/parsers"
// а не импортировать из каждого файла отдельно

export { parseAlfa } from "./alfa";
export { parseTinkoff } from "./tinkoff";
export { parseSber } from "./sber";
export { detectBank, normalizeDate, normalizeAmount } from "./normalize";
export type { RawTransaction } from "./normalize";
