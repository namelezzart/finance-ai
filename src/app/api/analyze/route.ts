// src/app/api/analyze/route.ts
// API route для AI-анализа расходов через Groq.
// Возвращает стриминговый ответ — текст приходит кусками, а не весь сразу.
// GROQ_API_KEY никогда не покидает сервер — это важно для безопасности.

import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Структура агрегированных данных которые клиент пришлёт в теле запроса
interface AnalyzePayload {
  totalExpenses: number;
  totalIncome: number;
  // value — название поля в pieData которое формирует AnalyticsClient
  topCategories: { name: string; value: number }[];
  monthlyData: { month: string; expenses: number; income: number }[];
  period: string; // например "январь 2026 — май 2026"
}

export async function POST(req: NextRequest) {
  // Проверяем авторизацию — анализ только для залогиненных пользователей
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Читаем агрегированные данные из тела запроса
  let payload: AnalyzePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY не настроен" },
      { status: 500 }
    );
  }

  // Формируем промпт с реальными данными пользователя.
  // Передаём агрегаты, а не сырые транзакции — меньше токенов, лучше качество.
  const topCatsText = payload.topCategories
    .slice(0, 7)
    .map((c, i) => `${i + 1}. ${c.name}: ${c.value.toLocaleString("ru-RU")} ₽`)
    .join("\n");

  const monthlyText = payload.monthlyData
    .map(
      (m) =>
        `• ${m.month}: расходы ${m.expenses.toLocaleString("ru-RU")} ₽, доходы ${m.income.toLocaleString("ru-RU")} ₽`
    )
    .join("\n");

  const prompt = `Ты — персональный финансовый советник. Проанализируй расходы пользователя и дай конкретные, полезные советы на русском языке.

ФИНАНСОВЫЕ ДАННЫЕ (период: ${payload.period}):

Общие расходы: ${payload.totalExpenses.toLocaleString("ru-RU")} ₽
Общие доходы: ${payload.totalIncome.toLocaleString("ru-RU")} ₽
Баланс: ${(payload.totalIncome - payload.totalExpenses).toLocaleString("ru-RU")} ₽

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

  // Groq возвращает Server-Sent Events (SSE): строки вида "data: {...}\n\n"
  // Нам нужно извлечь текст из каждого чанка и передать клиенту.
  // Создаём TransformStream — он преобразует SSE в чистый текст на лету.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      // groqResponse.body — это ReadableStream с SSE данными от Groq
      const reader = groqResponse.body!.getReader();
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
      // Transfer-Encoding: chunked — браузер знает что данные придут кусками
      "Transfer-Encoding": "chunked",
      // Отключаем кэширование — каждый анализ уникален
      "Cache-Control": "no-cache",
    },
  });
}
