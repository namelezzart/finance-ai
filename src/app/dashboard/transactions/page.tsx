// src/app/dashboard/transactions/page.tsx
// Серверный компонент — загружает данные, передаёт в TransactionsClient.
// Заголовок страницы живёт внутри TransactionsClient — не дублируем здесь.

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TransactionsClient from "@/components/TransactionsClient";

type TransactionsClientTransaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  merchant: string | null;
  bank: string;
};

export default async function TransactionsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, upload_id, user_id, date, amount, description, category, merchant, raw_data")
    .order("date", { ascending: false })
    .limit(500);

  if (error) console.error("Ошибка загрузки транзакций:", error);

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, bank")
    .order("created_at", { ascending: false });

  const uploadBankMap: Record<string, string> = {};
  (uploads ?? []).forEach((u) => { uploadBankMap[u.id] = u.bank; });

  const normalizedTransactions: TransactionsClientTransaction[] = (transactions ?? []).map((t, index) => ({
    id:          t.id ?? `${t.upload_id}-${t.date}-${index}`,
    date:        t.date,
    amount:      Number(t.amount),
    description: t.description || "",
    category:    t.category || "other",
    merchant:    t.merchant || null,
    bank:        uploadBankMap[t.upload_id] || "unknown",
  }));

  // Просто возвращаем клиентский компонент — он сам рендерит заголовок и отступы
  return <TransactionsClient transactions={normalizedTransactions} />;
}
