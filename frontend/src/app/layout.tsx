import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WhaleToasts } from "@/features/live-feed";
import { AuthProvider, AuthModal } from "@/features/auth";
import {
  NavbarProvider,
  AppShell,
  ActionLoaderProvider,
  QueryProvider,
} from "@/shared/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEPSE Analytics",
  description: "NEPSE market analytics",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d14" },
  ],
};

// Applies the saved (or OS) theme before first paint to avoid a flash.
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ActionLoaderProvider>
            <AuthProvider>
              <NavbarProvider>
                <AppShell>{children}</AppShell>
                <WhaleToasts />
                <AuthModal />
              </NavbarProvider>
            </AuthProvider>
          </ActionLoaderProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
