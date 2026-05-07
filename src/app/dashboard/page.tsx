/*
  dashboard/page.tsx — главная страница дашборда (Обзор)
  
  Server Component: данные загружаются на сервере через Supabase.
  Это быстрее чем fetch на клиенте — нет лишнего round-trip.
  
  Что показываем:
  - 4 метрики: расходы, доходы, баланс, кол-во транзакций
  - Топ-5 категорий по расходам
  - Последние 5 транзакций
*/

import { createClient } from "@/utils/supabase/server";
import DashboardOverviewClient from "@/components/DashboardOverviewClient";

/* Форматирование даты для Supabase фильтра — начало текущего месяца */
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

/* Отображение банка на русском */
const BANK_LABELS: Record<string, string> = {
  alfa:    "Альфа-Банк",
  tinkoff: "Т-Банк",
  sber:    "Сбер",
};

/* Цвета категорий — используются в клиентском компоненте */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  food_groceries:          { bg: "rgba(99,153,34,0.15)",  text: "#7ab83a", label: "Продукты"      },
  food_restaurants:        { bg: "rgba(186,117,23,0.15)", text: "#d4a050", label: "Рестораны"     },
  transport_public:        { bg: "rgba(55,138,221,0.15)", text: "#5da0e0", label: "Транспорт"     },
  transport_taxi:          { bg: "rgba(55,138,221,0.15)", text: "#5da0e0", label: "Такси"         },
  transport_fuel:          { bg: "rgba(55,138,221,0.15)", text: "#5da0e0", label: "Топливо"       },
  housing_utilities:       { bg: "rgba(124,58,237,0.15)", text: "#a78bfa", label: "Коммуналка"    },
  housing_rent:            { bg: "rgba(124,58,237,0.15)", text: "#a78bfa", label: "Аренда"        },
  health_pharmacy:         { bg: "rgba(29,158,117,0.15)", text: "#34d399", label: "Аптека"        },
  health_services:         { bg: "rgba(29,158,117,0.15)", text: "#34d399", label: "Здоровье"      },
  entertainment_streaming: { bg: "rgba(212,83,126,0.15)", text: "#e879a0", label: "Стриминг"      },
  entertainment_leisure:   { bg: "rgba(212,83,126,0.15)", text: "#e879a0", label: "Досуг"         },
  shopping_clothes:        { bg: "rgba(239,159,39,0.15)", text: "#f0a030", label: "Одежда"        },
  shopping_electronics:    { bg: "rgba(239,159,39,0.15)", text: "#f0a030", label: "Электроника"   },
  shopping_other:          { bg: "rgba(239,159,39,0.15)", text: "#f0a030", label: "Покупки"       },
  education:               { bg: "rgba(99,153,34,0.15)",  text: "#7ab83a", label: "Учёба"         },
  travel:                  { bg: "rgba(124,58,237,0.15)", text: "#a78bfa", label: "Путешествия"   },
  transfers:               { bg: "rgba(136,135,128,0.15)",text: "#a0a09a", label: "Переводы"      },
  income:                  { bg: "rgba(52,211,153,0.15)", text: "#34d399", label: "Доход"         },
  other:                   { bg: "rgba(136,135,128,0.15)",text: "#a0a09a", label: "Прочее"        },
};

export default async function DashboardPage() {
  /* createClient — всегда await в этом проекте (Next.js 16 + Supabase SSR) */
  const supabase = await createClient();

  const monthStart = getMonthStart();

  /* ---
    Загружаем все транзакции текущего месяца одним запросом.
    RLS автоматически фильтрует по user_id — безопасно.
    order by date desc — свежие сверху для "последних транзакций".
  --- */
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id,
      date,
      amount,
      description,
      category,
      merchant,
      upload_id,
      uploads ( bank )
    `)
    .gte("date", monthStart)
    .order("date", { ascending: false });

  /* ---
    Считаем метрики на сервере — не гоняем данные туда-сюда.
    amount < 0 = расход, amount > 0 = доход (из нашей схемы БД).
  --- */
  const allTx = transactions ?? [];

  const totalExpense = allTx
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalIncome = allTx
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  /* Топ категорий — группируем расходы по category */
  const categoryMap: Record<string, number> = {};
  allTx
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const cat = t.category ?? "other";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + Math.abs(t.amount);
    });

  /* Сортируем и берём топ-5 */
  const topCategories = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, amount]) => ({
      key,
      amount,
      label: CATEGORY_COLORS[key]?.label ?? key,
      pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

  /* Последние 5 транзакций для быстрого просмотра */
  const recentTx = allTx.slice(0, 5).map((t) => ({
    id:          t.id,
    date:        t.date,
    amount:      t.amount,
    description: t.description ?? "—",
    category:    t.category ?? "other",
    merchant:    t.merchant ?? null,
    /* uploads может быть объектом или массивом — обрабатываем оба случая */
    bank:        Array.isArray(t.uploads)
                   ? (t.uploads[0]?.bank ?? "")
                   : ((t.uploads as { bank?: string } | null)?.bank ?? ""),
  }));

  /* Текущий месяц для заголовка */
  const monthLabel = new Date().toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  /* ---
    Передаём подготовленные данные в Client Component.
    Сам расчёт и логика — на сервере (быстро, безопасно).
    Анимации и интерактивность — на клиенте.
  --- */
  return (
    <DashboardOverviewClient
      metrics={{
        totalExpense,
        totalIncome,
        balance,
        txCount: allTx.length,
      }}
      topCategories={topCategories}
      recentTransactions={recentTx}
      monthLabel={monthLabel}
      categoryColors={CATEGORY_COLORS}
      bankLabels={BANK_LABELS}
    />
  );
}
