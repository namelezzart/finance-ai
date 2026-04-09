// API роут: POST /api/parse-csv
//
// Что делает:
// 1. Получает CSV файл из FormData
// 2. Читает содержимое файла как текст
// 3. Определяет банк по заголовкам CSV (detectBank)
// 4. Запускает нужный парсер
// 5. Сохраняет запись об uploads в Supabase
// 6. Сохраняет все транзакции в Supabase
// 7. Возвращает результат клиенту
//
// Почему это API роут, а не Server Action:
// Файлы удобнее отправлять через FormData + fetch,
// а не через серверные экшены — проще отслеживать прогресс

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/utils/supabase/server";
import {
  detectBank,
  parseAlfa,
  parseTinkoff,
  parseSber,
} from "@/lib/parsers";

export async function POST(request: NextRequest) {
  try {
    // 1. Проверяем авторизацию
    // createClient() читает сессию из cookies запроса
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // 2. Читаем файл из FormData
    // FormData — стандартный способ отправки файлов через HTTP
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    // 3. Читаем содержимое файла
    // Для Сбера нужна специальная обработка кодировки Windows-1251
    // Для остальных банков — обычный UTF-8
    let csvText: string;

    const arrayBuffer = await file.arrayBuffer();

    // Пробуем определить кодировку:
    // TextDecoder с "windows-1251" корректно читает файлы Сбера
    // Для UTF-8 файлов (Альфа, Тинькофф) это тоже работает нормально
    try {
      const decoder = new TextDecoder("windows-1251");
      csvText = decoder.decode(arrayBuffer);

      // Если декодирование дало кракозябры — пробуем UTF-8
      // Простая эвристика: в UTF-8 файлах не будет символов замены
      if (csvText.includes("")) {
        csvText = new TextDecoder("utf-8").decode(arrayBuffer);
      }
    } catch {
      csvText = new TextDecoder("utf-8").decode(arrayBuffer);
    }

    // Убираем BOM если есть (Альфа и Тинькофф добавляют BOM в начало)
    csvText = csvText.replace(/^\uFEFF/, "");

    // 4. Определяем банк по заголовкам
    // Парсим только первую строку чтобы получить заголовки
    const firstLine = csvText.split("\n")[0];
    const { data: headerRow } = Papa.parse<string[]>(firstLine, {
      header: false,
    });

    // Заголовки могут быть с запятой или точкой с запятой —
    // Papa.parse автоматически определяет разделитель
    const headers = (headerRow[0] as unknown as string[]) ?? [];
    const bank = detectBank(headers);

    if (!bank) {
      return NextResponse.json(
        {
          error:
            "Не удалось определить банк. Поддерживаются: Тинькофф, Сбер, Альфа-банк.",
        },
        { status: 400 }
      );
    }

    // 5. Парсим CSV нужным парсером
    let rawTransactions;
    if (bank === "alfa") {
      rawTransactions = parseAlfa(csvText);
    } else if (bank === "tinkoff") {
      rawTransactions = parseTinkoff(csvText);
    } else {
      rawTransactions = parseSber(csvText);
    }

    if (rawTransactions.length === 0) {
      return NextResponse.json(
        { error: "Файл не содержит транзакций" },
        { status: 400 }
      );
    }

    // 6. Сохраняем запись о загрузке в таблицу uploads
    // Сначала создаём запись upload, получаем её id,
    // потом используем этот id при сохранении транзакций
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        user_id: user.id,
        file_name: file.name,
        bank,
        row_count: rawTransactions.length,
        status: "pending", // статус изменится на "done" после сохранения транзакций
      })
      .select()
      .single(); // .single() возвращает объект вместо массива

    if (uploadError || !upload) {
      console.error("Ошибка сохранения upload:", uploadError);
      return NextResponse.json(
        { error: "Ошибка сохранения в базу данных" },
        { status: 500 }
      );
    }

    // 7. Готовим транзакции для вставки в БД
    // Добавляем upload_id и user_id к каждой транзакции
    const transactionsToInsert = rawTransactions.map((t) => ({
      upload_id: upload.id,
      user_id: user.id,
      date: t.date,
      amount: t.amount,
      description: t.description,
      category: t.category,
      merchant: t.merchant ?? null,
      raw_data: t.rawData ?? null,
    }));

    // 8. Сохраняем транзакции пачками по 500 штук
    // Supabase имеет лимит на размер одного запроса,
    // поэтому большие файлы разбиваем на части
    const BATCH_SIZE = 500;
    for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
      const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);
      const { error: txError } = await supabase
        .from("transactions")
        .insert(batch);

      if (txError) {
        console.error("Ошибка сохранения транзакций:", txError);
        // Помечаем upload как ошибочный
        await supabase
          .from("uploads")
          .update({ status: "error" })
          .eq("id", upload.id);

        return NextResponse.json(
          { error: "Ошибка сохранения транзакций" },
          { status: 500 }
        );
      }
    }

    // 9. Обновляем статус upload на "done"
    await supabase
      .from("uploads")
      .update({ status: "done" })
      .eq("id", upload.id);

    // 10. Возвращаем результат
    return NextResponse.json({
      success: true,
      bank,
      uploadId: upload.id,
      count: rawTransactions.length,
    });
  } catch (error) {
    console.error("Неожиданная ошибка в /api/parse-csv:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
