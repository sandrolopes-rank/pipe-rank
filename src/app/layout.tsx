import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rank CRM - Gestão de Oportunidades",
  description: "Gerenciamento de oportunidades comerciais simples, flexível e poderoso.",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('rank-crm-theme');
    if (stored) {
      var theme = JSON.parse(stored);
      if (theme.paletteId) document.documentElement.setAttribute('data-palette', theme.paletteId);
      if (theme.mode) {
        document.documentElement.setAttribute('data-theme-mode', theme.mode);
        document.documentElement.style.colorScheme = theme.mode;
      }
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  } catch(e) {
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
      data-palette="violet"
      data-theme-mode="light"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}