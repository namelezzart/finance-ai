"use client";

/*
  AnalyticsClient.tsx — графики Recharts + AI-анализ через Groq
  
  "use client" — обязательно для Recharts (использует browser API).
  Также здесь живёт стриминг от /api/analyze.
*/

import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Sparkles, Loader2 } from "lucide-react";

interface Transaction {
  date:     string;
  amount:   number;
  category: string | null;
}

interface Props {
  transactions: Transaction[];
}

const PIE_COLORS = [
  "#7c3aed", "#6366f1", "#a78bfa", "#818cf8",
  "#c4b5fd", "#34d399", "#f59e0b", "#f87171",
  "#60a5fa", "#e879a0",
];

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

function formatRub(v: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency", currency: "RUB", maximumFractionDigits: 0,
  }).format(v);
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--glass-bg)", border: "0.5px solid var(--border-accent)",
      borderRadius: "var(--radius-md)", padding: "8px 12px",
      backdropFilter: "blur(16px)", fontSize: "13px",
    }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>{payload[0].name}</div>
      <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatRub(payload[0].value)}</div>
    </div>
  );
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--glass-bg)", border: "0.5px solid var(--border-accent)",
      borderRadius: "var(--radius-md)", padding: "10px 14px",
      backdropFilter: "blur(16px)", fontSize: "13px",
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: "6px", fontSize: "11px" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: "16px", color: p.color }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{formatRub(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsClient({ transactions }: Props) {
  const [aiText,    setAiText]    = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState("");

  /* Данные для Pie — топ-8 категорий расходов */
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const cat = t.category ?? "other";
        map[cat] = (map[cat] ?? 0) + Math.abs(t.amount);
      });

    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a);
    const top    = sorted.slice(0, 8);
    const rest   = sorted.slice(8).reduce((s, [, v]) => s + v, 0);

    const result = top.map(([key, value]) => ({
      name:  CAT_LABELS[key] ?? key,
      value: Math.round(value),
    }));
    if (rest > 0) result.push({ name: "Прочее", value: Math.round(rest) });
    return result;
  }, [transactions]);

  /*
    Данные для Bar — по месяцам.
    Ключи "Доходы"/"Расходы" нужны для Recharts Legend.
    Для route.ts конвертируем в expenses/income отдельно.
  */
  const barData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const key = monthKey(t.date);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (t.amount > 0) map[key].income  += t.amount;
      else              map[key].expense += Math.abs(t.amount);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expense }]) => ({
        month,
        "\u0414\u043e\u0445\u043e\u0434\u044b":  Math.round(income),
        "\u0420\u0430\u0441\u0445\u043e\u0434\u044b": Math.round(expense),
      }));
  }, [transactions]);

  /*
    AI-анализ — отправляем агрегаты в route.ts.
    
    route.ts ожидает точно такую структуру (из интерфейса AnalyzePayload):
      totalExpenses  — с "s" на конце
      totalIncome
      topCategories  — [{ name, value }]
      monthlyData    — [{ month, expenses, income }]  (не "Расходы"/"Доходы"!)
      period         — строка с диапазоном дат
  */
  async function runAnalysis() {
    setAiLoading(true);
    setAiText("");
    setAiError("");

    const totalExpenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = transactions
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);

    /* Период из первой и последней даты */
    const dates  = transactions.map((t) => t.date).sort();
    const period = dates.length
      ? new Date(dates[0]).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) +
        " — " +
        new Date(dates[dates.length - 1]).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
      : "текущий период";

    /* Конвертируем barData в формат который ждёт route */
    const monthlyData = barData.map((m) => ({
      month:    m.month,
      expenses: m["\u0420\u0430\u0441\u0445\u043e\u0434\u044b"],
      income:   m["\u0414\u043e\u0445\u043e\u0434\u044b"],
    }));

    try {
      const res = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topCategories: pieData,
          monthlyData,
          totalExpenses: Math.round(totalExpenses),
          totalIncome:   Math.round(totalIncome),
          period,
        }),
      });

      if (!res.ok || !res.body) {
        setAiError("Не удалось получить анализ");
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiText((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setAiError("Ошибка соединения с сервером");
    } finally {
      setAiLoading(false);
    }
  }

  const hasData = transactions.length > 0;

  return (
    <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>

      <div className="animate-fade-up">
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Аналитика
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {transactions.length} транзакций
        </p>
      </div>

      {!hasData && (
        <div className="glass-card animate-fade-up delay-1" style={{ padding: "56px", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Нет данных — загрузи выписку</p>
          <a href="/dashboard/upload" className="btn-accent" style={{ display: "inline-block", marginTop: "16px", textDecoration: "none" }}>
            Загрузить CSV
          </a>
        </div>
      )}

      {hasData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px" }}>

            <div className="glass-card animate-fade-up delay-1" style={{ padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "16px" }}>
                Расходы по категориям
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: "8px" }}>
                {pieData.slice(0, 6).map((item, i) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card animate-fade-up delay-2" style={{ padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "16px" }}>
                Доходы и расходы по месяцам
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(124,58,237,0.06)" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-muted)", paddingTop: "8px" }} />
                  <Bar dataKey="Доходы"  fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Расходы" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card animate-fade-up delay-3" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: aiText ? "14px" : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "30px", height: "30px", borderRadius: "8px",
                  background: "var(--accent-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles size={14} style={{ color: "var(--accent-light)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>ИИ-анализ расходов</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Groq · llama-3.3-70b</div>
                </div>
              </div>

              <button
                onClick={runAnalysis}
                disabled={aiLoading}
                className="btn-accent"
                style={{ display: "flex", alignItems: "center", gap: "6px", opacity: aiLoading ? 0.7 : 1 }}
              >
                {aiLoading
                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Анализирую...</>
                  : <><Sparkles size={14} /> {aiText ? "Повторить" : "Запустить анализ"}</>
                }
              </button>
            </div>

            {aiText && (
              <div style={{
                padding: "14px 16px",
                background: "var(--accent-subtle)",
                borderRadius: "var(--radius-md)",
                border: "0.5px solid var(--border-accent)",
              }}>
                <p style={{ fontSize: "14px", lineHeight: 1.75, color: "var(--text-primary)", margin: 0, whiteSpace: "pre-wrap" }}>
                  {aiText}
                  {aiLoading && (
                    <span style={{
                      display: "inline-block", width: "6px", height: "14px",
                      background: "var(--accent-light)", borderRadius: "1px",
                      marginLeft: "2px", verticalAlign: "middle",
                      animation: "blink 1s steps(1) infinite",
                    }} />
                  )}
                </p>
              </div>
            )}

            {aiError && (
              <div style={{
                padding: "12px 14px", background: "var(--color-expense-bg)",
                borderRadius: "var(--radius-md)", border: "0.5px solid var(--color-expense)",
                color: "var(--color-expense)", fontSize: "13px", marginTop: "12px",
              }}>
                {aiError}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
