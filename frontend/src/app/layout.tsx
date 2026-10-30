import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WhaleToasts } from "@/features/live-feed";
import { AuthProvider, AuthModal } from "@/features/auth";
import { Sidebar, ActionLoaderProvider, QueryProvider } from "@/shared/ui";

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
              <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  {children}
                </div>
              </div>
              <WhaleToasts />
              <AuthModal />
            </AuthProvider>
          </ActionLoaderProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
