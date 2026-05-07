// src/app/dashboard/history/page.tsx
// Серверный компонент — загружает список загрузок, передаёт в HistoryClient.
// Заголовок и отступы — внутри HistoryClient.

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import HistoryClient from "@/components/HistoryClient";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, file_name, bank, row_count, status, created_at")
    .order("created_at", { ascending: false });

  return <HistoryClient uploads={uploads ?? []} />;
}
