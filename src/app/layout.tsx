import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusDo",
  description: "像手帐一样精致的待办事项管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
