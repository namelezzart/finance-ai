// src/app/dashboard/transactions/page.tsx
// Серверный компонент — данные загружаются на сервере, клиент получает готовый HTML.
// Это один из ключевых паттернов Next.js App Router: fetch на сервере, потом передаём
// данные вниз в клиентские компоненты через props.

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TransactionsClient } from "@/components/TransactionsClient";
import type { Transaction } from "@/types";

// Эта функция выполняется на сервере при каждом запросе страницы.
// Пользователь НЕ видит Supabase-запросы — только готовые данные.
export default async function TransactionsPage() {
  // Создаём серверный Supabase-клиент (он использует куки для auth)
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Если не авторизован — редирект на логин
  if (!user) {
    redirect("/login");
  }

  // Загружаем транзакции пользователя из базы данных.
  // RLS (Row Level Security) автоматически фильтрует чужие данные —
  // мы получим только транзакции этого user.id.
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      upload_id,
      user_id,
      date,
      amount,
      description,
      category,
      merchant,
      raw_data
    `
    )
    .order("date", { ascending: false }) // Сначала самые новые
    .limit(500); // Ограничиваем для производительности

  if (error) {
    console.error("Ошибка загрузки транзакций:", error);
  }

  // Загружаем список загрузок (uploads) для фильтра по банку
  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, bank, file_name, created_at")
    .order("created_at", { ascending: false });

  // Создаём маппинг upload_id → bank для обогащения транзакций
  const uploadBankMap: Record<string, string> = {};
  if (uploads) {
    uploads.forEach((u) => {
      uploadBankMap[u.id] = u.bank;
    });
  }

  // Преобразуем данные из snake_case (БД) в camelCase (TypeScript-типы)
  const normalizedTransactions: (Transaction & { bank: string })[] = (
    transactions || []
  ).map((t) => ({
    id: t.id,
    uploadId: t.upload_id,
    userId: t.user_id,
    date: t.date,
    amount: Number(t.amount),
    description: t.description || "",
    category: t.category || "other",
    merchant: t.merchant || undefined,
    rawData: t.raw_data || undefined,
    bank: uploadBankMap[t.upload_id] || "unknown",
  }));

  // Передаём данные в клиентский компонент (он занимается фильтрами и рендерингом)
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Транзакции</h1>
        <p className="text-muted-foreground mt-1">
          {normalizedTransactions.length > 0
            ? `${normalizedTransactions.length} транзакций загружено`
            : "Пока нет транзакций — загрузите CSV файл"}
        </p>
      </div>

      {/* TransactionsClient — это "use client" компонент с фильтрами и таблицей */}
      <TransactionsClient transactions={normalizedTransactions} />
    </div>
  );
}
