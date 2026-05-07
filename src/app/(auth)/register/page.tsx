"use client";
// src/app/(auth)/register/page.tsx
// Страница регистрации.
// "use client" нужен потому что используем useState и обработчики событий.
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
 
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

      console.log("data:", data);
      console.log("error:", error);
 
    if (error) {
      // Показываем реальную ошибку от Supabase — полезно для отладки
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
    <Card>
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт Finance AI</CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Повторите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Войти
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}