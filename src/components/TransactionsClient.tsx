"use client";
// src/components/TransactionsClient.tsx
// Клиентский компонент — работает в браузере.
// Используем "use client" потому что нам нужны:
// - useState для хранения состояния фильтров
// - Интерактивность: клики, изменение полей ввода
// Сами данные уже готовы — переданы из серверного компонента через props.

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/types";
import type { Transaction } from "@/types";

// Расширенный тип — добавляем поле bank из uploads таблицы
type TransactionWithBank = Transaction & { bank: string };

// Русские названия категорий для отображения
const CATEGORY_LABELS: Record<string, string> = {
  food_groceries: "🛒 Продукты",
  food_restaurants: "🍽️ Рестораны",
  transport_public: "🚌 Транспорт",
  transport_taxi: "🚕 Такси",
  transport_fuel: "⛽ Топливо",
  housing_utilities: "💡 ЖКХ",
  housing_rent: "🏠 Аренда",
  health_pharmacy: "💊 Аптека",
  health_services: "🏥 Медицина",
  entertainment_streaming: "📺 Стриминг",
  entertainment_leisure: "🎭 Развлечения",
  shopping_clothes: "👗 Одежда",
  shopping_electronics: "💻 Электроника",
  shopping_other: "🛍️ Покупки",
  education: "📚 Образование",
  travel: "✈️ Путешествия",
  transfers: "💸 Переводы",
  income: "💰 Доход",
  other: "📦 Прочее",
};

// Названия банков
const BANK_LABELS: Record<string, string> = {
  tinkoff: "Тинькофф",
  sber: "Сбер",
  alfa: "Альфа-Банк",
  unknown: "Неизвестный",
};

// Количество строк на странице
const PAGE_SIZE = 50;

interface TransactionsClientProps {
  transactions: TransactionWithBank[];
}

export function TransactionsClient({ transactions }: TransactionsClientProps) {
  // Состояние фильтров — useState хранит значения между рендерами
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // 'all' | 'expense' | 'income'
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // useMemo — пересчитываем отфильтрованный список только когда меняются зависимости.
  // Это оптимизация: не фильтруем 500 строк при каждом рендере.
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Фильтр по тексту (ищем в описании и мерчанте)
      if (search) {
        const q = search.toLowerCase();
        const inDesc = t.description.toLowerCase().includes(q);
        const inMerchant = t.merchant?.toLowerCase().includes(q) ?? false;
        if (!inDesc && !inMerchant) return false;
      }

      // Фильтр по категории
      if (categoryFilter !== "all" && t.category !== categoryFilter)
        return false;

      // Фильтр по банку
      if (bankFilter !== "all" && t.bank !== bankFilter) return false;

      // Фильтр по типу (расход/доход)
      if (typeFilter === "expense" && t.amount >= 0) return false;
      if (typeFilter === "income" && t.amount < 0) return false;

      // Фильтр по дате ОТ
      if (dateFrom && t.date < dateFrom) return false;

      // Фильтр по дате ДО
      if (dateTo && t.date > dateTo) return false;

      return true;
    });
  }, [
    transactions,
    search,
    categoryFilter,
    bankFilter,
    typeFilter,
    dateFrom,
    dateTo,
  ]);

  // Пагинация — берём срез отфильтрованных данных
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Сбрасываем на первую страницу при изменении фильтров
  // (в реальности нужен useEffect, но здесь упрощаем)

  // Считаем итоги для выбранного периода
  const totals = useMemo(() => {
    const expenses = filtered
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const income = filtered
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    return { expenses, income };
  }, [filtered]);

  // Форматирование суммы в рубли
  const formatAmount = (amount: number) => {
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(abs);
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  // Форматирование даты для отображения
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Сброс всех фильтров
  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setBankFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  // Есть ли активные фильтры?
  const hasFilters =
    search ||
    categoryFilter !== "all" ||
    bankFilter !== "all" ||
    typeFilter !== "all" ||
    dateFrom ||
    dateTo;

  return (
    <div className="space-y-4">
      {/* Карточки с итогами */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Найдено транзакций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Расходы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              −
              {new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency: "RUB",
                maximumFractionDigits: 0,
              }).format(totals.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Доходы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              +
              {new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency: "RUB",
                maximumFractionDigits: 0,
              }).format(totals.income)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Блок фильтров */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Поиск по описанию */}
            <Input
              placeholder="Поиск по описанию или магазину..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Сброс страницы при поиске
              }}
            />

            {/* Фильтр по категории */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Фильтр по банку */}
            <Select
              value={bankFilter}
              onValueChange={(v) => {
                setBankFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все банки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все банки</SelectItem>
                <SelectItem value="tinkoff">Тинькофф</SelectItem>
                <SelectItem value="sber">Сбер</SelectItem>
                <SelectItem value="alfa">Альфа-Банк</SelectItem>
              </SelectContent>
            </Select>

            {/* Фильтр по типу */}
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Расходы и доходы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Расходы и доходы</SelectItem>
                <SelectItem value="expense">Только расходы</SelectItem>
                <SelectItem value="income">Только доходы</SelectItem>
              </SelectContent>
            </Select>

            {/* Дата ОТ */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Дата с</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Дата ДО */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Дата по</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Кнопка сброса — показывается только если есть активные фильтры */}
          {hasFilters && (
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Таблица транзакций */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {transactions.length === 0
                ? "Транзакций пока нет. Загрузите CSV файл на странице «Загрузка»."
                : "По заданным фильтрам ничего не найдено."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* overflow-x-auto — горизонтальная прокрутка на мобильных */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Дата</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Банк</TableHead>
                    <TableHead className="text-right w-[140px]">
                      Сумма
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((t) => (
                    <TableRow key={t.id}>
                      {/* Дата */}
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(t.date)}
                      </TableCell>

                      {/* Описание и мерчант */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">
                            {t.description || "—"}
                          </p>
                          {t.merchant && t.merchant !== t.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {t.merchant}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Категория — отображаем как Badge (тег) */}
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </Badge>
                      </TableCell>

                      {/* Банк */}
                      <TableCell className="text-sm text-muted-foreground">
                        {BANK_LABELS[t.bank] ?? t.bank}
                      </TableCell>

                      {/* Сумма — красная для расходов, зелёная для доходов */}
                      <TableCell
                        className={`text-right font-mono font-medium ${
                          t.amount < 0 ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {formatAmount(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Страница {currentPage} из {totalPages} (показано{" "}
                  {paginated.length} из {filtered.length})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Назад
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Вперёд →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
