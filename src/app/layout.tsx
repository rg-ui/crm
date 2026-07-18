import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StartupOS",
  description: "Your all-in-one startup workspace for tracking goals, managing teams, and staying productive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5, user-scalable=yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0E1015" />
        <meta name="color-scheme" content="dark" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
