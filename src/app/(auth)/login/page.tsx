"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Неверный email или пароль");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      <nav className="auth-mode-switch" aria-label="Авторизация">
        <Link href="/login" className="auth-mode-link active">
          Вход
        </Link>
        <Link href="/register" className="auth-mode-link">
          Регистрация
        </Link>
      </nav>

      <div className="auth-panel-header">
        <div className="auth-icon">
          <LockKeyhole size={21} />
        </div>
        <div>
          <h1>Вход</h1>
          <p>Продолжите работу с расходами, категориями и отчётами.</p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="auth-form">
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
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-accent auth-submit" disabled={loading}>
          {loading ? "Входим..." : "Войти"}
          <ArrowRight size={15} />
        </button>
      </form>
    </>
  );
}
