"use client";

/*
  upload/page.tsx — страница загрузки CSV выписок
  
  "use client" — потому что здесь активный drag-and-drop,
  useState для отслеживания файла и прогресса загрузки,
  и fetch к нашему API /api/parse-csv.
*/

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle, XCircle, CloudUpload, Loader2 } from "lucide-react";

/* Допустимые банки — для подсказки пользователю */
const BANKS = [
  { id: "alfa",    name: "Альфа-Банк", hint: "UTF-8, запятая" },
  { id: "tinkoff", name: "Т-Банк",     hint: "UTF-8 BOM, точка с запятой" },
  { id: "sber",    name: "Сбер",        hint: "Windows-1251, точка с запятой" },
];

type UploadStatus = "idle" | "dragging" | "loading" | "success" | "error";

export default function UploadPage() {
  const [status, setStatus]       = useState<UploadStatus>("idle");
  const [fileName, setFileName]   = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string>("");
  const [rowCount, setRowCount]   = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---
    Обработка файла — вызывается и при drag-and-drop и при клике.
    Отправляем FormData на /api/parse-csv, ждём ответ.
  --- */
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setStatus("error");
      setResultMsg("Нужен файл с расширением .csv");
      return;
    }

    setFileName(file.name);
    setStatus("loading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res  = await fetch("/api/parse-csv", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResultMsg(json.error ?? "Ошибка при обработке файла");
        return;
      }

      setStatus("success");
      setRowCount(json.rowCount ?? null);
      setResultMsg(json.bank ? `Банк определён: ${json.bank}` : "");
    } catch {
      setStatus("error");
      setResultMsg("Не удалось подключиться к серверу");
    }
  }, []);

  /* Drag события */
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setStatus("dragging"); };
  const onDragLeave = ()                   => { if (status === "dragging") setStatus("idle"); };
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  /* Сброс формы */
  const reset = () => {
    setStatus("idle");
    setFileName(null);
    setResultMsg("");
    setRowCount(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  /* Цвета зоны по статусу */
  const zoneStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      border: "1.5px dashed",
      borderRadius: "var(--radius-xl)",
      padding: "56px 40px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      cursor: "pointer",
      transition: "all 0.2s",
      textAlign: "center",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    };

    if (status === "dragging") return {
      ...base,
      borderColor: "var(--accent-light)",
      background:  "var(--accent-muted)",
      transform:   "scale(1.01)",
    };
    if (status === "success") return {
      ...base,
      borderColor: "var(--color-income)",
      background:  "var(--color-income-bg)",
      cursor:      "default",
    };
    if (status === "error") return {
      ...base,
      borderColor: "var(--color-expense)",
      background:  "var(--color-expense-bg)",
      cursor:      "default",
    };
    return {
      ...base,
      borderColor: "var(--border-accent)",
      background:  "var(--glass-bg)",
    };
  };

  return (
    <div className="responsive-padding" style={{ maxWidth: "680px", width: "100%", boxSizing: "border-box" }}>

      {/* Заголовок */}
      <div className="animate-fade-up" style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontSize: "22px", fontWeight: 600,
          color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em",
        }}>
          Загрузка выписки
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "6px 0 0" }}>
          CSV-файл из мобильного приложения или личного кабинета банка
        </p>
      </div>

      {/* Drag-and-drop зона */}
      <div
        className="upload-dropzone animate-fade-up delay-1"
        style={zoneStyle()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => status === "idle" && inputRef.current?.click()}
      >
        {/* Скрытый input для выбора файла */}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={onInputChange}
        />

        {/* Иконка по статусу */}
        <div style={{
          width: "64px", height: "64px",
          borderRadius: "20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: status === "success" ? "var(--color-income-bg)"
                    : status === "error"   ? "var(--color-expense-bg)"
                    : "var(--accent-muted)",
          /* Пульсирующая тень при загрузке */
          animation: status === "loading" ? "pulse 1.5s infinite" : "none",
        }}>
          {status === "idle"     && <CloudUpload size={28} style={{ color: "var(--accent-light)" }} />}
          {status === "dragging" && <Upload      size={28} style={{ color: "var(--accent-light)" }} />}
          {status === "loading"  && <Loader2     size={28} style={{ color: "var(--accent-light)", animation: "spin 1s linear infinite" }} />}
          {status === "success"  && <CheckCircle size={28} style={{ color: "var(--color-income)" }} />}
          {status === "error"    && <XCircle     size={28} style={{ color: "var(--color-expense)" }} />}
        </div>

        {/* Текст */}
        {status === "idle" && <>
          <div>
            <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
              Перетащи файл сюда
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              или нажми чтобы выбрать · только .csv
            </p>
          </div>
        </>}

        {status === "dragging" && (
          <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--accent-light)", margin: 0 }}>
            Отпусти файл
          </p>
        )}

        {status === "loading" && (
          <div>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
              Обрабатываю {fileName}
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Определяю банк, парсю транзакции...
            </p>
          </div>
        )}

        {status === "success" && (
          <div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-income)", margin: 0 }}>
              {rowCount !== null ? `Загружено ${rowCount} транзакций` : "Файл загружен"}
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              {fileName} · {resultMsg}
            </p>
          </div>
        )}

        {status === "error" && (
          <div>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-expense)", margin: 0 }}>
              Ошибка загрузки
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              {resultMsg}
            </p>
          </div>
        )}
      </div>

      {/* Кнопки после результата */}
      {(status === "success" || status === "error") && (
        <div className="animate-fade-up" style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button onClick={reset} className="btn-accent">
            Загрузить ещё один файл
          </button>
          {status === "success" && (
            <a
              href="/dashboard/transactions"
              style={{
                padding: "8px 16px", borderRadius: "var(--radius-md)",
                border: "0.5px solid var(--border-accent)",
                color: "var(--accent-light)", fontSize: "13px",
                textDecoration: "none", display: "inline-flex", alignItems: "center",
                background: "var(--accent-subtle)",
              }}
            >
              Смотреть транзакции →
            </a>
          )}
        </div>
      )}

      {/* Подсказки по форматам банков */}
      <div className="animate-fade-up delay-2" style={{ marginTop: "28px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
          Поддерживаемые банки
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {BANKS.map((bank) => (
            <div
              key={bank.id}
              className="glass-card bank-hint"
              style={{
                padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "var(--accent-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FileText size={14} style={{ color: "var(--accent-light)" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {bank.name}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {bank.hint}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Встроенные keyframes для spin и pulse */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 0 12px rgba(124,58,237,0); } }
      `}</style>
    </div>
  );
}
