import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { AdminHeader } from "@/components/admin-header";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "HobbyRentals — Admin",
  description: "Internal administration for HobbyRentals.",
  // Internal tooling. Even behind an auth wall, the URLs themselves should not
  // turn up in search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="font-sans flex min-h-full flex-col">
        <AdminHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
