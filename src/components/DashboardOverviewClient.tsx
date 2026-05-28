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

/* Моноширинный стек — терминальный характер интерфейса */
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

/* Склонение слова «операция» под число */
function pluralOps(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "операция";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "операции";
  return "операций";
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
      className="responsive-padding"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "1100px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ---- Масштхед страницы (терминальный спец-лист) ---- */}
      <header className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="page-header">
          <div>
            {/* Киккер — моно-метка раздела */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "6px",
              }}
            >
              FINANCE.AI <span style={{ color: "var(--text-muted)" }}>/ ПАНЕЛЬ</span>
            </div>
            <h1
              style={{
                fontFamily: MONO,
                fontSize: "27px",
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Обзор
            </h1>
            {/* Моно-строка статуса */}
            <p
              style={{
                fontFamily: MONO,
                fontSize: "12px",
                color: "var(--text-muted)",
                margin: "6px 0 0",
                letterSpacing: "0.02em",
              }}
            >
              {monthLabel.toUpperCase()}
              <span style={{ color: "var(--border-accent)", margin: "0 8px" }}>·</span>
              {metrics.txCount} {pluralOps(metrics.txCount)}
            </p>
          </div>

          <Link
            href="/dashboard/upload"
            className="btn-accent page-header-action"
            style={{ textDecoration: "none" }}
          >
            <Receipt size={14} />
            Загрузить выписку
          </Link>
        </div>

        {/* Хайрлайн-разделитель во всю ширину */}
        <div style={{ height: "1px", background: "var(--border)" }} />
      </header>

      {/* ---- Пустое состояние — терминальный модуль "ожидание данных" ---- */}
      {isEmpty && (
        <div
          className="empty-card animate-fade-up delay-1"
          style={{
            border: "1px dashed var(--border-accent)",
            borderRadius: "var(--radius-md)",
            background: "var(--glass-bg)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Receipt size={22} style={{ color: "var(--accent)" }} />
          </div>
          <p
            style={{
              fontFamily: MONO,
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: 0,
            }}
          >
            Нет данных<span className="caret-blink">_</span>
          </p>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>
            Пока нет транзакций за этот месяц
          </p>
          <p style={{ fontFamily: MONO, color: "var(--text-muted)", margin: 0, fontSize: "12px" }}>
            Загрузи выписку из банка чтобы начать анализ
          </p>
          <Link href="/dashboard/upload" className="btn-accent" style={{ textDecoration: "none", marginTop: "8px" }}>
            Загрузить CSV
          </Link>
        </div>
      )}

      {/* ---- Карточки метрик (4 штуки в ряд) ---- */}
      {!isEmpty && (
        <div className="metrics-grid">
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
        <div className="two-col-grid">
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
                            width: "100%",
                            transformOrigin: "left",
                            background: `linear-gradient(90deg, ${color.text}aa, ${color.text})`,
                            borderRadius: "3px",
                            /* Заливка через transform: scaleX (без reflow).
                               --p = доля; keyframe растёт от 0 до scaleX(var(--p)). */
                            ["--p" as string]: cat.pct / 100,
                            animation: "bar-grow 0.6s cubic-bezier(0.32, 0.72, 0, 1) both",
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
        <div
          style={{
            fontFamily: MONO,
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <span style={{ color: "var(--accent)" }}>//</span>
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: "11px",
              color: "var(--text-muted)",
              marginTop: "3px",
              letterSpacing: "0.02em",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
