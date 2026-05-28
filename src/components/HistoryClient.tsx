"use client";

/*
  HistoryClient.tsx — история загрузок CSV
  
  "use client" — AlertDialog для подтверждения удаления,
  useState для списка (удаление обновляет локальный стейт),
  fetch к DELETE /api/uploads/[id].
*/

import { useState } from "react";
import { Trash2, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

/* ---------------------------------------------------------------
   Типы
   -------------------------------------------------------------- */
interface Upload {
  id:         string;
  file_name:  string;
  bank:       string;
  row_count:  number | null;
  status:     string;
  created_at: string;
}

interface Props {
  uploads: Upload[];
}

/* ---------------------------------------------------------------
   Константы
   -------------------------------------------------------------- */
const BANK_LABELS: Record<string, string> = {
  alfa:    "Альфа-Банк",
  tinkoff: "Т-Банк",
  sber:    "Сбер",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ---------------------------------------------------------------
   Иконка + цвет статуса
   -------------------------------------------------------------- */
function StatusBadge({ status }: { status: string }) {
  const config = {
    done:    { icon: <CheckCircle size={13} />, color: "var(--color-income)",   bg: "var(--color-income-bg)",   label: "Готово"    },
    error:   { icon: <XCircle     size={13} />, color: "var(--color-expense)",  bg: "var(--color-expense-bg)",  label: "Ошибка"    },
    pending: { icon: <Clock       size={13} />, color: "var(--accent-light)",   bg: "var(--accent-muted)",      label: "В процессе" },
  }[status] ?? { icon: <AlertTriangle size={13} />, color: "var(--text-muted)", bg: "var(--border)", label: status };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "20px",
      background: config.bg, color: config.color,
      fontSize: "11px", fontWeight: 500,
    }}>
      {config.icon}
      {config.label}
    </span>
  );
}

/* ---------------------------------------------------------------
   Главный компонент
   -------------------------------------------------------------- */
export default function HistoryClient({ uploads: initialUploads }: Props) {
  /* Локальный стейт — удаление убирает строку без перезагрузки страницы */
  const [uploads,     setUploads]     = useState(initialUploads);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [confirmId,   setConfirmId]   = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string>("");

  /* Удаление — вызывается после подтверждения */
  async function handleDelete(id: string) {
    setDeletingId(id);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/uploads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error ?? "Не удалось удалить загрузку");
        return;
      }
      /* Убираем из локального стейта — страница не перезагружается */
      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setErrorMsg("Ошибка соединения с сервером");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="responsive-padding" style={{ display: "flex", flexDirection: "column", gap: "20px", boxSizing: "border-box", width: "100%" }}>

      {/* Заголовок */}
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          История загрузок
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {uploads.length} {uploads.length === 1 ? "файл" : uploads.length < 5 ? "файла" : "файлов"}
        </p>
      </div>

      {/* Сообщение об ошибке */}
      {errorMsg && (
        <div style={{
          padding: "12px 14px",
          background: "var(--color-expense-bg)",
          border: "0.5px solid var(--color-expense)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-expense)", fontSize: "13px",
        }}>
          {errorMsg}
        </div>
      )}

      {/* Пустое состояние */}
      {uploads.length === 0 && (
        <div className="glass-card empty-card animate-fade-up delay-1">
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "var(--accent-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText size={22} style={{ color: "var(--accent-light)" }} />
          </div>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "15px" }}>
            Ещё нет загрузок
          </p>
          <a href="/dashboard/upload" className="btn-accent" style={{ textDecoration: "none", marginTop: "4px" }}>
            Загрузить первый файл
          </a>
        </div>
      )}

      {/* Таблица загрузок */}
      {uploads.length > 0 && (
        <div className="glass-card animate-fade-up delay-1" style={{ overflow: "hidden" }}>

          {/* Шапка */}
          <div className="history-grid" style={{ borderBottom: "0.5px solid var(--border)" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Файл</div>
            <div className="history-col-bank" style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Банк</div>
            <div className="history-col-rows" style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Строк</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Статус</div>
            <div className="history-col-date" style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Дата загрузки</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }} />
          </div>

          {/* Строки */}
          {uploads.map((upload, i) => (
            <div key={upload.id}>
              <div
                className="history-grid"
                style={{
                  borderBottom: i < uploads.length - 1 ? "0.5px solid var(--border)" : "none",
                  transition: "background 0.12s",
                  opacity: deletingId === upload.id ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Имя файла */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "8px",
                    background: "var(--accent-muted)", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FileText size={14} style={{ color: "var(--accent-light)" }} />
                  </div>
                  <span style={{
                    fontSize: "13px", fontWeight: 500, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {upload.file_name}
                  </span>
                </div>

                {/* Банк */}
                <span className="history-col-bank" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {BANK_LABELS[upload.bank] ?? upload.bank}
                </span>

                {/* Кол-во строк */}
                <span className="history-col-rows" style={{ fontSize: "13px", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                  {upload.row_count ?? "—"}
                </span>

                {/* Статус */}
                <StatusBadge status={upload.status} />

                {/* Дата */}
                <span className="history-col-date" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {formatDateTime(upload.created_at)}
                </span>

                {/* Кнопка удаления */}
                <button
                  onClick={() => setConfirmId(upload.id)}
                  disabled={deletingId === upload.id}
                  style={{
                    width: "30px", height: "30px",
                    borderRadius: "var(--radius-md)",
                    border: "0.5px solid transparent",
                    background: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-expense-bg)";
                    e.currentTarget.style.color      = "var(--color-expense)";
                    e.currentTarget.style.borderColor= "var(--color-expense)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background  = "none";
                    e.currentTarget.style.color       = "var(--text-muted)";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Inline подтверждение удаления — под строкой */}
              {confirmId === upload.id && (
                <div className="history-confirm animate-reveal-down" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "var(--color-expense-bg)",
                  borderBottom: i < uploads.length - 1 ? "0.5px solid var(--border)" : "none",
                  gap: "12px",
                }}>
                  <span style={{ fontSize: "13px", color: "var(--color-expense)" }}>
                    Удалить «{upload.file_name}» и все её транзакции?
                  </span>
                  <div className="history-confirm-actions" style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => setConfirmId(null)}
                      style={{
                        padding: "5px 12px", borderRadius: "var(--radius-md)",
                        border: "0.5px solid var(--border)", background: "var(--glass-bg)",
                        color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer",
                      }}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => handleDelete(upload.id)}
                      disabled={deletingId === upload.id}
                      style={{
                        padding: "5px 12px", borderRadius: "var(--radius-md)",
                        border: "none", background: "var(--color-expense)",
                        color: "white", fontSize: "12px", cursor: "pointer",
                        opacity: deletingId === upload.id ? 0.6 : 1,
                      }}
                    >
                      {deletingId === upload.id ? "Удаляю..." : "Да, удалить"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
