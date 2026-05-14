"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
 
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
 
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
 
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
 
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
 
    setLoading(true);
    const supabase = createClient();
 
    const { data, error } = await supabase.auth.signUp({ email, password });
 
    if (error) {
      setError(`Ошибка: ${error.message}`);
      setLoading(false);
      return;
    }
 
    // Email confirm ОТКЛЮЧЁН в Supabase Dashboard (для разработки).
    // Значит после signUp пользователь сразу активен и имеет сессию.
    // Проверяем: если session есть — редиректим сразу на dashboard.
    // Если session нет — значит confirm всё-таки включён, показываем сообщение.
    if (data.session) {
      // Сессия есть — пользователь сразу вошёл, идём в дашборд
      router.push("/dashboard");
      router.refresh(); // Обновляем серверные компоненты чтобы они увидели новую сессию
    } else {
      // Сессии нет — Supabase ждёт подтверждения email
      setError(
        "Проверьте почту — мы отправили письмо для подтверждения аккаунта. " +
        "Или отключите Email Confirm в Supabase Dashboard → Authentication → Settings."
      );
      setLoading(false);
    }
  };
 
  return (
    <>
      <nav className="auth-mode-switch" aria-label="Авторизация">
        <Link href="/login" className="auth-mode-link">
          Вход
        </Link>
        <Link href="/register" className="auth-mode-link active">
          Регистрация
        </Link>
      </nav>

      <div className="auth-panel-header">
        <div className="auth-icon">
          <UserPlus size={21} />
        </div>
        <div>
          <h1>Регистрация</h1>
          <p>Создайте аккаунт, чтобы сохранять выписки и историю анализа.</p>
        </div>
      </div>

      <form onSubmit={handleRegister} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <div className="auth-input-wrap">
            <Mail size={16} />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">Пароль</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={16} />
            <input
              id="password"
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword">Повторите пароль</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={16} />
            <input
              id="confirmPassword"
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-accent auth-submit" disabled={loading}>
          {loading ? "Создаём..." : "Создать аккаунт"}
          <ArrowRight size={15} />
        </button>
      </form>
    </>
  );
}
