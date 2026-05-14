// src/app/api/analyze/route.ts
// API route для AI-анализа расходов через Groq.
// Возвращает стриминговый ответ — текст приходит кусками, а не весь сразу.
// GROQ_API_KEY никогда не покидает сервер — это важно для безопасности.

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface TransactionRow {
  date: string;
  amount: number | string;
  category: string | null;
}

const CAT_LABELS: Record<string, string> = {
  food_groceries:          "Продукты",
  food_restaurants:        "Рестораны",
  transport_public:        "Транспорт",
  transport_taxi:          "Такси",
  transport_fuel:          "Топливо",
  housing_utilities:       "Коммуналка",
  housing_rent:            "Аренда",
  health_pharmacy:         "Аптека",
  health_services:         "Здоровье",
  entertainment_streaming: "Стриминг",
  entertainment_leisure:   "Досуг",
  shopping_clothes:        "Одежда",
  shopping_electronics:    "Электроника",
  shopping_other:          "Покупки",
  education:               "Учёба",
  travel:                  "Путешествия",
  transfers:               "Переводы",
  income:                  "Доход",
  other:                   "Прочее",
};

function formatRub(value: number): string {
  return value.toLocaleString("ru-RU");
}

function formatMonth(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("ru-RU", {
    month: "short",
    year: "2-digit",
  });
}

function formatPeriod(firstDate: string, lastDate: string): string {
  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });

  return `${formatDate(firstDate)} — ${formatDate(lastDate)}`;
}

function buildFinancialSummary(transactions: TransactionRow[]) {
  const categoryMap: Record<string, number> = {};
  const monthlyMap: Record<string, { month: string; expenses: number; income: number }> = {};

  let totalExpenses = 0;
  let totalIncome = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) continue;

    const monthKey = transaction.date.slice(0, 7);
    monthlyMap[monthKey] ??= {
      month: formatMonth(transaction.date),
      expenses: 0,
      income: 0,
    };

    if (amount < 0) {
      const expense = Math.abs(amount);
      const category = transaction.category ?? "other";
      totalExpenses += expense;
      categoryMap[category] = (categoryMap[category] ?? 0) + expense;
      monthlyMap[monthKey].expenses += expense;
    } else {
      totalIncome += amount;
      monthlyMap[monthKey].income += amount;
    }
  }

  const sortedCategories = Object.entries(categoryMap).sort(([, a], [, b]) => b - a);
  const topCategories = sortedCategories.slice(0, 8).map(([category, value]) => ({
    name: CAT_LABELS[category] ?? category,
    value: Math.round(value),
  }));

  const rest = sortedCategories.slice(8).reduce((sum, [, value]) => sum + value, 0);
  if (rest > 0) {
    topCategories.push({ name: "Прочее", value: Math.round(rest) });
  }

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => ({
      month: value.month,
      expenses: Math.round(value.expenses),
      income: Math.round(value.income),
    }));

  return {
    totalExpenses: Math.round(totalExpenses),
    totalIncome: Math.round(totalIncome),
    topCategories,
    monthlyData,
    period: formatPeriod(transactions[0].date, transactions[transactions.length - 1].date),
  };
}

export async function POST() {
  // Проверяем авторизацию — анализ только для залогиненных пользователей
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Данные для анализа берём только с сервера.
  // Так endpoint нельзя использовать для произвольного prompt-а за счёт нашего Groq ключа,
  // а RLS Supabase продолжает фильтровать транзакции текущим пользователем.
  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("date, amount, category")
    .order("date", { ascending: true })
    .limit(1000);

  if (transactionsError) {
    console.error("Ошибка загрузки транзакций для анализа:", transactionsError);
    return NextResponse.json(
      { error: "Не удалось загрузить данные для анализа" },
      { status: 500 }
    );
  }

  if (!transactions?.length) {
    return NextResponse.json(
      { error: "Недостаточно данных для анализа" },
      { status: 422 }
    );
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY не настроен" },
      { status: 500 }
    );
  }

  const summary = buildFinancialSummary(transactions);

  // Формируем промпт с реальными данными пользователя.
  // Передаём агрегаты, а не сырые транзакции — меньше токенов и ниже риск утечки деталей.
  const topCatsText = summary.topCategories
    .slice(0, 7)
    .map((c, i) => `${i + 1}. ${c.name}: ${formatRub(c.value)} ₽`)
    .join("\n");

  const monthlyText = summary.monthlyData
    .map(
      (m) =>
        `• ${m.month}: расходы ${formatRub(m.expenses)} ₽, доходы ${formatRub(m.income)} ₽`
    )
    .join("\n");

  const prompt = `Ты — персональный финансовый советник. Проанализируй расходы пользователя и дай конкретные, полезные советы на русском языке.

ФИНАНСОВЫЕ ДАННЫЕ (период: ${summary.period}):

Общие расходы: ${formatRub(summary.totalExpenses)} ₽
Общие доходы: ${formatRub(summary.totalIncome)} ₽
Баланс: ${formatRub(summary.totalIncome - summary.totalExpenses)} ₽

Топ категорий расходов:
${topCatsText}

Динамика по месяцам:
${monthlyText}

Напиши анализ в формате:
1. **Общая картина** — 2-3 предложения о финансовом состоянии
2. **Что настораживает** — конкретные категории где стоит сократить расходы и почему
3. **Что хорошо** — положительные моменты в финансовом поведении
4. **3 конкретных совета** — практические действия которые можно сделать уже сейчас

Будь конкретным, используй цифры из данных. Не используй общие фразы вроде "старайтесь экономить". Тон — дружелюбный, но честный.`;

  // Запрашиваем Groq API со стримингом (stream: true)
  const groqResponse = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // API ключ передаётся только на сервере — клиент его никогда не видит
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
        stream: true, // включаем стриминг — ответ придёт кусками (SSE формат)
      }),
    }
  );

  if (!groqResponse.ok) {
    const err = await groqResponse.text();
    console.error("Groq API error:", err);
    return NextResponse.json(
      { error: "Ошибка Groq API" },
      { status: 502 }
    );
  }

  if (!groqResponse.body) {
    return NextResponse.json(
      { error: "Пустой ответ Groq API" },
      { status: 502 }
    );
  }
  const groqBody = groqResponse.body;

  // Groq возвращает Server-Sent Events (SSE): строки вида "data: {...}\n\n"
  // Нам нужно извлечь текст из каждого чанка и передать клиенту.
  // Создаём TransformStream — он преобразует SSE в чистый текст на лету.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      // groqResponse.body — это ReadableStream с SSE данными от Groq
      const reader = groqBody.getReader();
      let buffer = ""; // буфер для неполных строк

      try {
        while (true) {
          // Читаем следующий чанк байт от Groq
          const { done, value } = await reader.read();
          if (done) break;

          // Декодируем байты в строку и добавляем к буферу
          buffer += decoder.decode(value, { stream: true });

          // SSE приходит построчно: "data: {...}\n\n"
          // Разбиваем буфер по переносам строк
          const lines = buffer.split("\n");

          // Последняя строка может быть неполной — оставляем в буфере
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();

            // Пропускаем пустые строки и служебные SSE события
            if (!trimmed || trimmed === "data: [DONE]") continue;

            // Каждая строка с данными выглядит так: "data: {"choices":[...]}"
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6)); // убираем "data: "
                // В streaming режиме текст находится в delta.content
                const text = json.choices?.[0]?.delta?.content;
                if (text) {
                  // Отправляем текст клиенту — он немедленно появится в браузере
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Некоторые чанки могут быть не-JSON (например "[DONE]") — игнорируем
              }
            }
          }
        }
      } catch (err) {
        console.error("Ошибка чтения стрима:", err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  // Возвращаем стрим клиенту с правильными заголовками
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Отключаем кэширование — каждый анализ уникален
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
