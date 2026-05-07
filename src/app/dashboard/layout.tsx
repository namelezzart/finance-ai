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
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",  /* Скролл только здесь — sidebar не трогается */
          height: "100vh",
        }}
      >
        {children}
      </main>
    </div>
  );
}
