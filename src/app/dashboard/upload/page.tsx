"use client";

// "use client" нужен потому что используем:
// - useState (состояние компонента)
// - useRouter (навигация после загрузки)
// - обработчики событий (drag, click, change)
// Всё это работает только в браузере, не на сервере

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

interface ParseResult {
  success: boolean;
  bank: string;
  uploadId: string;
  count: number;
  error?: string;
}

const BANK_NAMES: Record<string, string> = {
  alfa: "Альфа-банк",
  tinkoff: "Тинькофф",
  sber: "Сбербанк",
};

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParseResult | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Только CSV файлы");
      setState("error");
      return;
    }
    setFile(f);
    setState("selected");
    setErrorMessage("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleReset = () => {
    setFile(null);
    setState("idle");
    setErrorMessage("");
    setProgress(0);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setState("uploading");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 15));
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-csv", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      const data: ParseResult = await response.json();

      if (!response.ok || data.error) {
        setErrorMessage(data.error ?? "Неизвестная ошибка");
        setState("error");
        return;
      }

      setResult(data);
      setState("success");
    } catch {
      clearInterval(interval);
      setErrorMessage("Ошибка соединения с сервером");
      setState("error");
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold mb-1">Загрузить выписку</h2>
      <p className="text-muted-foreground mb-6">
        Поддерживаются выписки Тинькофф, Сбер и Альфа-банка в формате CSV
      </p>

      {state === "success" && result ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <CheckCircle2 className="text-green-500" size={48} />
            <div>
              <p className="font-medium">Выписка загружена!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {BANK_NAMES[result.bank] ?? result.bank} — {result.count} транзакций сохранено
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Загрузить ещё
              </Button>
              <Button className="flex-1" onClick={() => router.push("/dashboard/transactions")}>
                Смотреть транзакции
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging && "border-primary bg-primary/5",
                state === "error"
                  ? "border-destructive bg-destructive/5"
                  : !isDragging && "border-muted-foreground/25 hover:border-primary/50"
              )}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInputChange}
              />

              {(state === "idle" || state === "error") && (
                <div className="flex flex-col items-center gap-3">
                  <Upload size={32} className={state === "error" ? "text-destructive" : "text-muted-foreground"} />
                  <div>
                    <p className="font-medium text-sm">Перетащите файл сюда или нажмите для выбора</p>
                    <p className="text-xs text-muted-foreground mt-1">Только .csv файлы</p>
                  </div>
                  {state === "error" && <p className="text-sm text-destructive">{errorMessage}</p>}
                </div>
              )}

              {state === "selected" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={24} className="text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{file?.name}</p>
                      <p className="text-xs text-muted-foreground">{file ? (file.size / 1024).toFixed(1) : 0} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {state === "uploading" && (
                <div className="flex flex-col items-center gap-3">
                  <FileText size={32} className="text-primary" />
                  <p className="text-sm font-medium">Обрабатываем файл...</p>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              )}
            </div>

            {state === "selected" && (
              <Button className="w-full" onClick={handleUpload}>
                Загрузить и обработать
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
