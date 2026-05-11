import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zomo Design Office - Decode design, distill style.",
  description: "收集、提取、复用、上传任意网站截图或图片，一键提取设计DNA，构建你的风格参考库",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
