// Страница аналитики с графиками
// Здесь будут:
// - Круговая диаграмма расходов по категориям (Recharts PieChart)
// - Линейный график трат по месяцам (Recharts LineChart)
// - Тепловая карта по дням (Recharts)
// - AI-инсайты от Groq llama-3.3-70b
//
// Всё это — клиентские компоненты ("use client"), потому что
// Recharts использует браузерные API и не работает на сервере

export default function AnalyticsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-1">Аналитика</h2>
      <p className="text-muted-foreground">
        Загрузите выписку чтобы увидеть графики и AI-анализ расходов.
      </p>
    </div>
  );
}
