import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AccountTypeProvider } from "@/context/AccountTypeContext";
import { Toaster } from "sonner";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { NavigationEvents } from "@/components/ui/NavigationEvents";
import NavigationProgress from "@/components/NavigationProgress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PileTrackerPro",
  description: "Track your piles, organize your life",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full w-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full`}
      >
        <AuthProvider>
          <AccountTypeProvider>
            <ThemeProvider>
              <NavigationProgress />
              <LoadingIndicator />
              <NavigationEvents />
              {children}
              <Toaster position="top-right" richColors />
            </ThemeProvider>
          </AccountTypeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
