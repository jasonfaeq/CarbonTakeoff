import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CommandPalette } from "@/components/CommandPalette";
import { HatchDefs } from "@/components/Hatch";
import { Toaster } from "@/components/Toaster";
import { Welcome } from "@/components/Welcome";
import { themeBootScript } from "@/lib/theme-boot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Carbon Takeoff", template: "%s · Carbon Takeoff" },
  authors: [{ name: "Jason Faeq" }],
  description: "Embodied-carbon screening for bills of materials and specifications, with a source for every factor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <HatchDefs />
        <AppHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <CommandPalette />
        <Welcome />
        <Toaster />
        <AppFooter />
      </body>
    </html>
  );
}
