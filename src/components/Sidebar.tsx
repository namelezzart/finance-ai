"use client";

/*
  Sidebar.tsx — навигационная боковая панель
  
  "use client" нужен потому что:
  1. Используем хук usePathname() для определения активного пункта
  2. Используем useState для переключения темы
  3. Обрабатываем события (клик на logout, toggle темы)
  
  Тема хранится в localStorage и применяется как класс "light" на <html>.
  По умолчанию — тёмная тема (класс не установлен).
*/

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  LayoutDashboard,
  Upload,
  List,
  PieChart,
  History,
  LogOut,
  Sun,
  Moon,
  Hexagon,
} from "lucide-react";

/* ---------------------------------------------------------------
   Описание пунктов навигации
   Добавить новый раздел — просто добавь объект в этот массив.
   -------------------------------------------------------------- */
const NAV_ITEMS = [
  { href: "/dashboard",              label: "Обзор",        icon: LayoutDashboard },
  { href: "/dashboard/upload",       label: "Загрузка",     icon: Upload          },
  { href: "/dashboard/transactions", label: "Транзакции",   icon: List            },
  { href: "/dashboard/analytics",    label: "Аналитика",    icon: PieChart        },
  { href: "/dashboard/history",      label: "История",      icon: History         },
];

/* Применяем тему — добавляем/убираем класс "light" на <html> */
function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
  }
}

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("theme") !== "light";
  });

  /* ---
    Применяем сохранённую/текущую тему.
    Это нужно чтобы тема не "мигала" при обновлении страницы.
  --- */
  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  /* Выход из аккаунта — signOut() очищает сессию Supabase */
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  /* ---
    Определяем активный пункт:
    - /dashboard/analytics совпадает с href "/dashboard/analytics"
    - /dashboard (корень) — точное совпадение, иначе все были бы активными
  --- */
  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
    <aside
      className="desktop-sidebar"
      style={{
        width: "220px",
        height: "100vh",
        position: "sticky",
        top: 0,
        boxSizing: "border-box",  /* padding входит в height: 100vh */
        overflow: "hidden",
        background: "var(--sidebar-bg)",
        borderRight: "0.5px solid var(--sidebar-border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink: 0,
      }}
    >
      {/* ---- Логотип ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "4px 10px 20px",
          borderBottom: "0.5px solid var(--border)",
          marginBottom: "8px",
        }}
      >
        {/* Иконка — шестиугольник с градиентом */}
        <div
          style={{
            width: "30px",
            height: "30px",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 12px rgba(124, 58, 237, 0.4)",
          }}
        >
          <Hexagon size={16} color="white" strokeWidth={1.5} />
        </div>

        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--accent-light)",
              letterSpacing: "0.01em",
              lineHeight: 1.2,
            }}
          >
            Finance AI
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
            }}
          >
            аналитика расходов
          </div>
        </div>
      </div>

      {/* ---- Навигация ---- */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className={`nav-link ${isActive(href) ? "active" : ""}`}
          >
            <Icon
              size={16}
              strokeWidth={isActive(href) ? 2 : 1.5}
              /* Активная иконка чуть ярче */
              style={{ flexShrink: 0, opacity: isActive(href) ? 1 : 0.7 }}
            />
            {label}
          </a>
        ))}
      </nav>

      {/* ---- Нижняя часть: тема + выход ---- */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          paddingTop: "12px",
          paddingBottom: "8px",
          borderTop: "0.5px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* Переключатель темы */}
        <button
          onClick={toggleTheme}
          className="nav-link"
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {isDark ? (
            <>
              <Sun size={16} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.7 }} />
              Светлая тема
            </>
          ) : (
            <>
              <Moon size={16} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.7 }} />
              Тёмная тема
            </>
          )}
        </button>

        {/* Выход из аккаунта */}
        <button
          onClick={handleLogout}
          className="nav-link"
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            color: "var(--color-expense)",
            opacity: 0.7,
          }}
        >
          <LogOut size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          Выйти
        </button>
      </div>
    </aside>

    {/* ---- Мобильная нижняя навигация ---- */}
    <nav className="mobile-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 10px",
            borderRadius: "var(--radius-md)",
            color: isActive(href) ? "var(--nav-active-text)" : "var(--nav-text)",
            textDecoration: "none",
            background: isActive(href) ? "var(--nav-active-bg)" : "none",
            transition: "background 0.15s, color 0.15s",
            minWidth: "52px",
            justifyContent: "center",
          }}
        >
          <Icon size={20} strokeWidth={isActive(href) ? 2 : 1.5} />
          <span style={{ fontSize: "10px", fontWeight: isActive(href) ? 500 : 400 }}>
            {label}
          </span>
        </a>
      ))}
    </nav>
    </>
  );
}
