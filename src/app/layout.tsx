import type { Metadata, Viewport } from "next";
import InteractiveBackground from "@/components/InteractiveBackground";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Finance AI",
  description: "Аналитика личных расходов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/*
          Блокирующий скрипт — применяет сохранённую тему ДО первого пейнта.
          Без него html-снапшот с сервера всегда тёмный, и при светлой теме
          пользователь видит «всполох» dark→light после гидратации.
          suppressHydrationWarning на html нужен потому что класс light
          добавляется этим скриптом ещё до hydration.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light')}catch(e){}})()",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <InteractiveBackground />
        {children}
      </body>
    </html>
  );
}
