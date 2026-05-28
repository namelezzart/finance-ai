"use client";

/*
  TransactionsClient.tsx — таблица транзакций с фильтрами
  
  "use client" — фильтры и пагинация работают через useState/useMemo,
  без перезагрузки страницы. Данные уже загружены серверным компонентом.
  
  Визуальные изменения в этой версии:
  - Glassmorphism карточка для блока фильтров
  - Строки таблицы с hover-эффектом и плавными переходами
  - Badge категорий с цветами из нашей палитры
  - Пагинация в стиле приложения
*/

import { useState, useMemo } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

/* ---------------------------------------------------------------
   Типы
   -------------------------------------------------------------- */
interface Transaction {
  id:          string;
  date:        string;
  amount:      number;
  description: string;
  category:    string | null;
  merchant:    string | null;
  bank:        string;
}

interface Props {
  transactions: Transaction[];
}

/* ---------------------------------------------------------------
   Константы
   -------------------------------------------------------------- */
const PAGE_SIZE = 50;

const BANK_LABELS: Record<string, string> = {
  alfa:    "Альфа-Банк",
  tinkoff: "Т-Банк",
  sber:    "Сбер",
};

/* Цвета категорий — badge */
const CAT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  food_groceries:          { bg: "rgba(99,153,34,0.15)",   text: "#7ab83a", label: "Продукты"    },
  food_restaurants:        { bg: "rgba(186,117,23,0.15)",  text: "#d4a050", label: "Рестораны"   },
  transport_public:        { bg: "rgba(55,138,221,0.15)",  text: "#5da0e0", label: "Транспорт"   },
  transport_taxi:          { bg: "rgba(55,138,221,0.15)",  text: "#5da0e0", label: "Такси"       },
  transport_fuel:          { bg: "rgba(55,138,221,0.15)",  text: "#5da0e0", label: "Топливо"     },
  housing_utilities:       { bg: "rgba(255,176,0,0.13)",  text: "#ffca5c", label: "Коммуналка"  },
  housing_rent:            { bg: "rgba(255,176,0,0.13)",  text: "#ffca5c", label: "Аренда"      },
  health_pharmacy:         { bg: "rgba(29,158,117,0.15)",  text: "#34d399", label: "Аптека"      },
  health_services:         { bg: "rgba(29,158,117,0.15)",  text: "#34d399", label: "Здоровье"    },
  entertainment_streaming: { bg: "rgba(212,83,126,0.15)",  text: "#e879a0", label: "Стриминг"    },
  entertainment_leisure:   { bg: "rgba(212,83,126,0.15)",  text: "#e879a0", label: "Досуг"       },
  shopping_clothes:        { bg: "rgba(239,159,39,0.15)",  text: "#f0a030", label: "Одежда"      },
  shopping_electronics:    { bg: "rgba(239,159,39,0.15)",  text: "#f0a030", label: "Электроника" },
  shopping_other:          { bg: "rgba(239,159,39,0.15)",  text: "#f0a030", label: "Покупки"     },
  education:               { bg: "rgba(99,153,34,0.15)",   text: "#7ab83a", label: "Учёба"       },
  travel:                  { bg: "rgba(255,176,0,0.13)",  text: "#ffca5c", label: "Путешествия" },
  transfers:               { bg: "rgba(136,135,128,0.15)", text: "#a0a09a", label: "Переводы"    },
  income:                  { bg: "rgba(52,211,153,0.15)",  text: "#34d399", label: "Доход"       },
  other:                   { bg: "rgba(136,135,128,0.15)", text: "#a0a09a", label: "Прочее"      },
};

/* Форматирование */
function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency", currency: "RUB", maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ---------------------------------------------------------------
   Главный компонент
   -------------------------------------------------------------- */
export default function TransactionsClient({ transactions }: Props) {
  /* Состояние фильтров */
  const [search,    setSearch]    = useState("");
  const [category,  setCategory]  = useState("all");
  const [bank,      setBank]      = useState("all");
  const [type,      setType]      = useState("all"); /* all | expense | income */
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [page,      setPage]      = useState(1);
  const [sortDir,   setSortDir]   = useState<"desc" | "asc">("desc");

  /* Уникальные категории для фильтра — из реальных данных */
  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category ?? "other"));
    return Array.from(cats).sort();
  }, [transactions]);

  /* Уникальные банки */
  const banks = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.bank))).filter(Boolean);
  }, [transactions]);

  /* ---
    Фильтрация + сортировка через useMemo.
    Пересчитывается только при изменении фильтров — не при каждом рендере.
  --- */
  const filtered = useMemo(() => {
    const result = transactions.filter((t) => {
      /* Поиск по описанию и мерчанту */
      if (search) {
        const q = search.toLowerCase();
        const inDesc     = t.description?.toLowerCase().includes(q);
        const inMerchant = t.merchant?.toLowerCase().includes(q);
        if (!inDesc && !inMerchant) return false;
      }
      /* Категория */
      if (category !== "all" && (t.category ?? "other") !== category) return false;
      /* Банк */
      if (bank !== "all" && t.bank !== bank) return false;
      /* Тип */
      if (type === "expense" && t.amount >= 0) return false;
      if (type === "income"  && t.amount <  0) return false;
      /* Даты */
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo   && t.date > dateTo)   return false;
      return true;
    });

    /* Сортировка по дате */
    result.sort((a, b) =>
      sortDir === "desc"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );

    return result;
  }, [transactions, search, category, bank, type, dateFrom, dateTo, sortDir]);

  /* Пагинация */
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* Сброс на первую страницу при изменении фильтров */
  function updateFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  /* Суммы по отфильтрованным данным */
  const totalExpense = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome  = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  /* Стиль для select — переиспользуем */
  const selectStyle: React.CSSProperties = {
    background:   "var(--glass-bg)",
    border:       "0.5px solid var(--border)",
    borderRadius: "var(--radius-md)",
    color:        "var(--text-primary)",
    padding:      "7px 10px",
    fontSize:     "13px",
    outline:      "none",
    cursor:       "pointer",
    appearance:   "none",
    WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233b5bff' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    paddingRight: "28px",
  };

  return (
    <div className="responsive-padding" style={{ display: "flex", flexDirection: "column", gap: "16px", boxSizing: "border-box", width: "100%" }}>

      {/* Заголовок + карточки метрик */}
      <div className="page-header animate-fade-up">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Транзакции
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            {filtered.length} из {transactions.length}
          </p>
        </div>

        {/* Карточки расходов и доходов — как на дашборде */}
        <div className="header-metrics">
          <div className="metric-card" style={{
            minWidth: "150px",
            boxShadow: "0 0 0 0.5px var(--glass-border), 0 8px 32px rgba(248,113,113,0.1)",
          }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              Расходы
            </div>
            <div className="amount-expense" style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {formatRub(totalExpense)}
            </div>
          </div>
          <div className="metric-card" style={{
            minWidth: "150px",
            boxShadow: "0 0 0 0.5px var(--glass-border), 0 8px 32px rgba(52,211,153,0.1)",
          }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              Доходы
            </div>
            <div className="amount-income" style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {formatRub(totalIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* Блок фильтров */}
      <div
        className="glass-card filters-row animate-fade-up delay-1"
        style={{ padding: "14px 16px" }}
      >
        <Filter size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

        {/* Поиск */}
        <div className="filter-grow" style={{ position: "relative", flex: "1", minWidth: "180px" }}>
          <Search size={13} style={{
            position: "absolute", left: "10px", top: "50%",
            transform: "translateY(-50%)", color: "var(--text-muted)",
          }} />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => updateFilter(() => setSearch(e.target.value))}
            style={{
              ...selectStyle,
              paddingLeft: "30px",
              paddingRight: "10px",
              backgroundImage: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Категория */}
        <select value={category} onChange={(e) => updateFilter(() => setCategory(e.target.value))} style={selectStyle}>
          <option value="all">Все категории</option>
          {categories.map((c) => (
            <option key={c} value={c}>{CAT_COLORS[c]?.label ?? c}</option>
          ))}
        </select>

        {/* Банк */}
        <select value={bank} onChange={(e) => updateFilter(() => setBank(e.target.value))} style={selectStyle}>
          <option value="all">Все банки</option>
          {banks.map((b) => (
            <option key={b} value={b}>{BANK_LABELS[b] ?? b}</option>
          ))}
        </select>

        {/* Тип */}
        <select value={type} onChange={(e) => updateFilter(() => setType(e.target.value))} style={selectStyle}>
          <option value="all">Все типы</option>
          <option value="expense">Расходы</option>
          <option value="income">Доходы</option>
        </select>

        {/* Даты */}
        <input type="date" value={dateFrom} onChange={(e) => updateFilter(() => setDateFrom(e.target.value))}
          style={{ ...selectStyle, backgroundImage: "none", minWidth: "130px" }} />
        <input type="date" value={dateTo} onChange={(e) => updateFilter(() => setDateTo(e.target.value))}
          style={{ ...selectStyle, backgroundImage: "none", minWidth: "130px" }} />

        {/* Сброс */}
        {(search || category !== "all" || bank !== "all" || type !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setCategory("all"); setBank("all"); setType("all"); setDateFrom(""); setDateTo(""); setPage(1); }}
            style={{
              background: "none", border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-md)", color: "var(--text-muted)",
              padding: "7px 12px", fontSize: "12px", cursor: "pointer",
            }}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Таблица */}
      <div className="glass-card animate-fade-up delay-2" style={{ overflow: "hidden" }}>
        {/* Шапка */}
        <div className="tx-grid" style={{ borderBottom: "0.5px solid var(--border)" }}>
          {/* Дата с сортировкой */}
          <button
            onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: "11px",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}
          >
            Дата <ArrowUpDown size={11} />
          </button>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Описание</div>
          <div className="tx-col-category" style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Категория</div>
          <div className="tx-col-bank" style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Банк</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Сумма</div>
        </div>

        {/* Строки */}
        {paginated.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
            Ничего не найдено
          </div>
        ) : (
          paginated.map((tx, i) => {
            const isExpense = tx.amount < 0;
            const cat = CAT_COLORS[tx.category ?? "other"] ?? CAT_COLORS.other;

            return (
              <div
                key={tx.id}
                className="tx-grid"
                style={{
                  borderBottom: i < paginated.length - 1 ? "0.5px solid var(--border)" : "none",
                  transition: "background 0.12s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Дата */}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {formatDate(tx.date)}
                </span>

                {/* Описание */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 500, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {tx.merchant ?? tx.description}
                  </div>
                  {tx.merchant && (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.description}
                    </div>
                  )}
                </div>

                {/* Категория */}
                <span className="tx-col-category badge-category" style={{ background: cat.bg, color: cat.text }}>
                  {cat.label}
                </span>

                {/* Банк */}
                <span className="tx-col-bank" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {BANK_LABELS[tx.bank] ?? tx.bank}
                </span>

                {/* Сумма */}
                <span className={isExpense ? "amount-expense" : "amount-income"} style={{ textAlign: "right" }}>
                  {isExpense ? "−" : "+"}{formatRub(tx.amount)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div
          className="animate-fade-up"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: "32px", height: "32px", borderRadius: "var(--radius-md)",
              border: "0.5px solid var(--border)", background: "var(--glass-bg)",
              color: "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: page === 1 ? 0.4 : 1, transition: "opacity 0.15s",
            }}
          >
            <ChevronLeft size={14} />
          </button>

          {/* Номера страниц — показываем до 7 */}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1
                    : page <= 4      ? i + 1
                    : page >= totalPages - 3 ? totalPages - 6 + i
                    : page - 3 + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: "32px", height: "32px", borderRadius: "var(--radius-md)",
                  border: p === page ? "0.5px solid var(--accent)" : "0.5px solid var(--border)",
                  background: p === page ? "var(--accent-muted)" : "var(--glass-bg)",
                  color: p === page ? "var(--accent-light)" : "var(--text-secondary)",
                  fontSize: "13px", cursor: "pointer", fontWeight: p === page ? 500 : 400,
                  transition: "all 0.15s",
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              width: "32px", height: "32px", borderRadius: "var(--radius-md)",
              border: "0.5px solid var(--border)", background: "var(--glass-bg)",
              color: "var(--text-secondary)", cursor: page === totalPages ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: page === totalPages ? 0.4 : 1, transition: "opacity 0.15s",
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
