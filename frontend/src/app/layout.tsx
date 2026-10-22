import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WhaleToasts } from "@/features/live-feed";
import { Nav } from "@/shared/ui/Nav";
import { QueryProvider } from "@/shared/ui/QueryProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <Nav />
          {children}
          <WhaleToasts />
        </QueryProvider>
      </body>
    </html>
  );
}
