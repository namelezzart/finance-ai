"use client";

/*
  DashboardOverviewClient.tsx — клиентская часть дашборда
  
  "use client" нужен для:
  - Анимаций (animate-fade-up с задержками через className)
  - Форматирования чисел (Intl.NumberFormat — браузерный API)
  - Будущих интерактивных фильтров
  
  Получает уже посчитанные данные от server component (page.tsx),
  только отображает их красиво.
*/

import { TrendingDown, TrendingUp, Wallet, Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";

/* ---------------------------------------------------------------
   Типы пропсов — описываем что ожидаем от серверного компонента
   -------------------------------------------------------------- */
interface Metrics {
  totalExpense: number;
  totalIncome:  number;
  balance:      number;
  txCount:      number;
}

interface CategoryStat {
  key:    string;
  amount: number;
  label:  string;
  pct:    number;
}

interface RecentTx {
  id:          string;
  date:        string;
  amount:      number;
  description: string;
  category:    string;
  merchant:    string | null;
  bank:        string;
}

interface CategoryColor {
  bg:    string;
  text:  string;
  label: string;
}

interface Props {
  metrics:            Metrics;
  topCategories:      CategoryStat[];
  recentTransactions: RecentTx[];
  monthLabel:         string;
  categoryColors:     Record<string, CategoryColor>;
  bankLabels:         Record<string, string>;
}

/* ---------------------------------------------------------------
   Хелпер форматирования суммы в рубли
   Intl.NumberFormat — встроенный браузерный форматтер.
   "ru-RU" + currency: "RUB" даёт красивый формат: 47 820 ₽
   -------------------------------------------------------------- */
function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style:    "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

/* Форматирование даты: "2026-04-06" → "6 апр" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day:   "numeric",
    month: "short",
  });
}

export default function DashboardOverviewClient({
  metrics,
  topCategories,
  recentTransactions,
  monthLabel,
  categoryColors,
  bankLabels,
}: Props) {
  /* Пустое состояние — нет транзакций за месяц */
  const isEmpty = metrics.txCount === 0;

  return (
    <div
      style={{
        padding: "28px 28px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "1100px",
        width: "100%",
      }}
    >
      {/* ---- Заголовок страницы ---- */}
      <div
        className="animate-fade-up"
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Обзор
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            {monthLabel}
          </p>
        </div>

        <Link
          href="/dashboard/upload"
          className="btn-accent"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Receipt size={14} />
          Загрузить выписку
        </Link>
      </div>

      {/* ---- Пустое состояние ---- */}
      {isEmpty && (
        <div
          className="glass-card animate-fade-up delay-1"
          style={{
            padding: "48px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "var(--accent-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Receipt size={24} style={{ color: "var(--accent-light)" }} />
          </div>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "15px" }}>
            Пока нет транзакций за этот месяц
          </p>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "13px" }}>
            Загрузи выписку из банка чтобы начать анализ
          </p>
          <Link href="/dashboard/upload" className="btn-accent" style={{ textDecoration: "none", marginTop: "8px" }}>
            Загрузить CSV
          </Link>
        </div>
      )}

      {/* ---- Карточки метрик (4 штуки в ряд) ---- */}
      {!isEmpty && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {/* Расходы */}
          <MetricCard
            label="Расходы"
            value={formatRub(metrics.totalExpense)}
            icon={<TrendingDown size={18} />}
            accentColor="var(--color-expense)"
            glowColor="rgba(248, 113, 113, 0.15)"
            className="animate-fade-up delay-1"
          />

          {/* Доходы */}
          <MetricCard
            label="Доходы"
            value={formatRub(metrics.totalIncome)}
            icon={<TrendingUp size={18} />}
            accentColor="var(--color-income)"
            glowColor="rgba(52, 211, 153, 0.15)"
            className="animate-fade-up delay-2"
          />

          {/* Баланс */}
          <MetricCard
            label="Баланс"
            value={formatRub(metrics.balance)}
            icon={<Wallet size={18} />}
            accentColor="var(--accent-light)"
            glowColor="var(--accent-muted)"
            className="animate-fade-up delay-3"
          />

          {/* Транзакций */}
          <MetricCard
            label="Транзакций"
            value={metrics.txCount.toString()}
            icon={<Receipt size={18} />}
            accentColor="var(--accent-light)"
            glowColor="var(--accent-subtle)"
            className="animate-fade-up delay-4"
          />
        </div>
      )}

      {/* ---- Нижняя часть: топ категорий + последние транзакции ---- */}
      {!isEmpty && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: "16px",
          }}
        >
          {/* Топ категорий */}
          <div
            className="glass-card animate-fade-up"
            style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <SectionHeader title="Топ категорий" subtitle="по расходам за месяц" />

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topCategories.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                  Нет данных
                </p>
              ) : (
                topCategories.map((cat) => {
                  const color = categoryColors[cat.key] ?? categoryColors.other;
                  return (
                    <div key={cat.key}>
                      {/* Строка: название + сумма */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "5px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {/* Цветная точка-индикатор */}
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: color.text,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            {cat.label}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                            {formatRub(cat.amount)}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "6px" }}>
                            {cat.pct}%
                          </span>
                        </div>
                      </div>

                      {/* Прогресс-бар */}
                      <div
                        style={{
                          height: "3px",
                          background: "var(--border)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${cat.pct}%`,
                            background: `linear-gradient(90deg, ${color.text}aa, ${color.text})`,
                            borderRadius: "3px",
                            /* Анимация прогресс-бара при загрузке */
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Последние транзакции */}
          <div
            className="glass-card animate-fade-up delay-1"
            style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <SectionHeader
              title="Последние транзакции"
              action={
                <Link
                  href="/dashboard/transactions"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "var(--accent-light)",
                    textDecoration: "none",
                    opacity: 0.8,
                  }}
                >
                  Все <ArrowRight size={12} />
                </Link>
              }
            />

            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentTransactions.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                  Нет транзакций
                </p>
              ) : (
                recentTransactions.map((tx, i) => {
                  const isExpense = tx.amount < 0;
                  const color = categoryColors[tx.category] ?? categoryColors.other;
                  const bankName = bankLabels[tx.bank] ?? tx.bank;

                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: "grid",
                        /* Описание | badge | сумма */
                        gridTemplateColumns: "1fr auto auto",
                        gap: "12px",
                        alignItems: "center",
                        padding: "9px 6px",
                        /* Разделитель между строками */
                        borderBottom: i < recentTransactions.length - 1
                          ? "0.5px solid var(--border)"
                          : "none",
                        borderRadius: "var(--radius-sm)",
                        transition: "background 0.15s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-surface-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Описание + дата */}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            /* Обрезаем длинные названия */
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tx.merchant ?? tx.description}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            marginTop: "1px",
                          }}
                        >
                          {formatDate(tx.date)}{bankName ? ` · ${bankName}` : ""}
                        </div>
                      </div>

                      {/* Badge категории */}
                      <span
                        className="badge-category"
                        style={{ background: color.bg, color: color.text }}
                      >
                        {color.label}
                      </span>

                      {/* Сумма */}
                      <span className={isExpense ? "amount-expense" : "amount-income"}>
                        {isExpense ? "−" : "+"}{formatRub(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Вспомогательные компоненты — выносим повторяющиеся части
   -------------------------------------------------------------- */

/* Карточка одной метрики */
function MetricCard({
  label,
  value,
  icon,
  accentColor,
  glowColor,
  className,
}: {
  label:       string;
  value:       string;
  icon:        React.ReactNode;
  accentColor: string;
  glowColor:   string;
  className?:  string;
}) {
  return (
    <div
      className={`metric-card ${className ?? ""}`}
      style={{
        /* Тонкая цветная тень для глубины */
        boxShadow: `0 0 0 0.5px var(--glass-border), 0 8px 32px ${glowColor}`,
      }}
    >
      {/* Иконка в цветном кружке */}
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          background: glowColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
          marginBottom: "12px",
        }}
      >
        {icon}
      </div>

      {/* Мелкая подпись */}
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      {/* Основное число */}
      <div
        style={{
          fontSize: "22px",
          fontWeight: 600,
          color: accentColor,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* Заголовок секции с подписью и опциональным action */
function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title:     string;
  subtitle?: string;
  action?:   React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
