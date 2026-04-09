// src/app/api/parse-csv/route.ts
// API Route — выполняется на сервере, никогда в браузере.
// Next.js App Router: файл называется route.ts, экспортируем именованные функции по HTTP-методам.

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseCSV } from "@/lib/parsers";

export async function POST(req: Request) {
  // Серверный клиент Supabase — использует куки для определения пользователя
  const supabase = await createClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Получаем файл из FormData (браузер отправляет multipart/form-data)
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }

  // ─── ЗАЩИТА ОТ ПОВТОРНОЙ ЗАГРУЗКИ ──────────────────────────────────────────
  // Проверяем: не загружал ли этот пользователь файл с таким же именем раньше?
  // Это простая но эффективная защита — если файл называется одинаково,
  // скорее всего это одна и та же выписка.
  const { data: existingUpload } = await supabase
    .from("uploads")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("file_name", file.name)
    .eq("status", "done") // Проверяем только успешно завершённые загрузки
    .single();

  if (existingUpload) {
    // Возвращаем ошибку с понятным сообщением для пользователя
    return NextResponse.json(
      {
        error: `Файл "${file.name}" уже был загружен ранее. Если хотите перезагрузить — сначала удалите предыдущую загрузку в истории.`,
        existingUploadId: existingUpload.id,
      },
      { status: 409 } // 409 Conflict — стандартный HTTP-статус для конфликта данных
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Читаем содержимое файла как ArrayBuffer (нужно для правильной обработки кодировок)
  const buffer = await file.arrayBuffer();

  // Парсим CSV — функция из src/lib/parsers/index.ts
  // Она определяет банк по заголовкам и вызывает нужный парсер
  let parseResult;
  try {
    parseResult = await parseCSV(buffer, file.name);
  } catch (err) {
    console.error("Ошибка парсинга CSV:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Не удалось распознать формат файла",
      },
      { status: 422 }
    );
  }

  const { bank, transactions } = parseResult;

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "Файл не содержит транзакций или имеет неверный формат" },
      { status: 422 }
    );
  }

  // Создаём запись об uploads со статусом 'pending'
  // Статус меняется на 'done' после успешного сохранения транзакций
  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      user_id: user.id,
      file_name: file.name,
      bank,
      row_count: transactions.length,
      status: "pending",
    })
    .select()
    .single();

  if (uploadError || !upload) {
    console.error("Ошибка создания upload:", uploadError);
    return NextResponse.json(
      { error: "Ошибка сохранения данных о файле" },
      { status: 500 }
    );
  }

  // Подготавливаем транзакции для вставки в БД
  // Преобразуем camelCase (TypeScript) → snake_case (PostgreSQL)
  const rows = transactions.map((t) => ({
    upload_id: upload.id,
    user_id: user.id,
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
    merchant: t.merchant ?? null,
    raw_data: t.rawData ?? null,
  }));

  // Вставляем все транзакции одним батч-запросом (эффективнее чем по одной)
  const { error: txError } = await supabase.from("transactions").insert(rows);

  if (txError) {
    console.error("Ошибка вставки транзакций:", txError);

    // Если вставка не удалась — обновляем статус upload на 'error'
    // чтобы пользователь мог попробовать снова
    await supabase
      .from("uploads")
      .update({ status: "error" })
      .eq("id", upload.id);

    return NextResponse.json(
      { error: "Ошибка сохранения транзакций" },
      { status: 500 }
    );
  }

  // Всё прошло успешно — обновляем статус на 'done'
  await supabase
    .from("uploads")
    .update({ status: "done" })
    .eq("id", upload.id);

  return NextResponse.json({
    uploadId: upload.id,
    bank,
    count: transactions.length,
  });
}
