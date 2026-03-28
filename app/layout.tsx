import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Intelligence Copilot",
  description: "Braze CRM data aggregated into a single cockpit view",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 font-sans">{children}</body>
    </html>
  );
}
