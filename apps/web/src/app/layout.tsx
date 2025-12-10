import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-serif",
  style: ["normal", "italic"]
});

export const metadata: Metadata = {
  title: "Vantage",
  description: "AI-powered user experience testing with realistic personas",
  icons: {
    icon: "/images/vantage_favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${inter.className}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
