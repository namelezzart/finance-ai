import { Hexagon } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-bg auth-shell">
      <main className="auth-main">
        <section className="auth-panel animate-fade-up">
          <div className="auth-window-top">
            <Link href="/" className="auth-brand" aria-label="Finance AI">
              <span className="auth-brand-mark">
                <Hexagon size={17} strokeWidth={1.6} />
              </span>
              <span>
                <span className="auth-brand-title">Finance AI</span>
                <span className="auth-brand-subtitle">аналитика расходов</span>
              </span>
            </Link>
            <ThemeToggle />
          </div>

          {children}
        </section>
      </main>
    </div>
  );
}
