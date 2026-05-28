/*
  template.tsx — в отличие от layout.tsx пересоздаётся при каждой навигации,
  поэтому годится для входной анимации при смене роута внутри дашборда.
  Цель — ориентация/непрерывность при переходе, а не декор.
  Сама анимация (.route-enter) уважает prefers-reduced-motion.
*/

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-enter">{children}</div>;
}
