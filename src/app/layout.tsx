import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/assistant/chat-widget";
import { ToastProvider } from "@/components/toast";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Headings only (the `heading` utility); body copy stays Inter.
const display = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  // Makes the opengraph-image beside this file an absolute URL in link previews.
  metadataBase: siteUrl(),
  title: "HobbyRentals — Rent hobby gear in Singapore",
  description:
    "Rent cameras, camping kit, instruments and tools from people near you in Singapore, or earn from gear you're not using.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="font-sans min-h-full flex flex-col">
        <ToastProvider>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
