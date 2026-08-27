import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AppShellProvider } from "@/context/AppShellContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Future Search - Chat with the internet",
  description:
    "Future Search is an AI assistant connected to the internet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full" lang="en">
      <body className={`${inter.className} h-full`}>
        <AppShellProvider>
          <Sidebar>{children}</Sidebar>
        </AppShellProvider>
      </body>
    </html>
  );
}