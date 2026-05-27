/*
  dashboard/layout.tsx — layout для всех страниц дашборда

  Ключевая идея:
  - html/body: overflow hidden (в globals.css) — страница не скроллится целиком
  - sidebar: position sticky, height 100vh — всегда виден полностью
  - main: overflow-y auto — скроллится только контент, sidebar остаётся на месте
*/

import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="page-bg"
      style={{
        display: "flex",
        height: "100vh",      /* Занимаем ровно высоту экрана */
        overflow: "hidden",   /* Внешний контейнер не скроллится */
      }}
    >
      <Sidebar />

      <main
        className="dashboard-main"
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",   /* Скролл только здесь — sidebar не трогается */
          overflowX: "hidden", /* Никакого горизонтального свайпа */
          height: "100vh",
          /* ВАЖНО: border-box чтобы padding-top/bottom для mobile-header
             и mobile-nav (52px + 60px) вычитались ИЗ 100vh, а не добавлялись.
             Без этого нижние 112px main'а уходят за viewport и контент
             прячется под nav. */
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}
