// src/app/api/uploads/[id]/route.ts
// API route для удаления загрузки и всех её транзакций.
// Next.js App Router: файл в папке [id] создаёт динамический роут /api/uploads/:id

import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Тип params в Next.js 16 — это Promise (изменение относительно Next.js 14)
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  // В Next.js 16 params — это Promise, нужно await
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID не указан" }, { status: 400 });
  }

  // Создаём серверный клиент Supabase (имеет доступ к cookies → сессии)
  const supabase = await createClient();

  // Проверяем авторизацию — неавторизованным удалять нельзя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Порядок удаления важен из-за внешних ключей (foreign keys):
  // transactions.upload_id → uploads.id
  // Сначала удаляем дочерние записи (transactions), потом родительскую (uploads).
  
  // Шаг 1: удаляем транзакции этой загрузки.
  // RLS + user_id фильтр = двойная защита: удалим только свои транзакции.
  const { error: txError } = await supabase
    .from("transactions")
    .delete()
    .eq("upload_id", id)
    .eq("user_id", user.id); // дополнительная проверка владельца

  if (txError) {
    console.error("Ошибка удаления транзакций:", txError);
    return NextResponse.json(
      { error: `Ошибка удаления транзакций: ${txError.message}` },
      { status: 500 }
    );
  }

  // Шаг 2: удаляем саму запись загрузки.
  // user_id проверяем явно — даже если RLS уже фильтрует, это хорошая практика.
  const { error: uploadError } = await supabase
    .from("uploads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (uploadError) {
    console.error("Ошибка удаления upload:", uploadError);
    return NextResponse.json(
      { error: `Ошибка удаления: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 204 No Content — стандартный ответ для успешного DELETE без тела
  return new NextResponse(null, { status: 204 });
}
