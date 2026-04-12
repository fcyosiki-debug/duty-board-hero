import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/hooks/useAppContext";

export const metadata: Metadata = {
  title: "Hero & Harmony Duty Board",
  description: "小学生向け当番表アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
