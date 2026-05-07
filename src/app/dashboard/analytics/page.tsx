// src/app/dashboard/analytics/page.tsx
// Серверный компонент — загружает транзакции, передаёт в AnalyticsClient.
// Заголовок и отступы — внутри AnalyticsClient.

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "@/components/AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("date, amount, category")
    .order("date", { ascending: true });

  return <AnalyticsClient transactions={transactions ?? []} />;
}
