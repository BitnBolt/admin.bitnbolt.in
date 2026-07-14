import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://admin.bitnbolt.in"),
  title: {
    default: "BitnBolt Admin",
    template: "%s · BitnBolt Admin",
  },
  description:
    "BitnBolt admin panel — manage orders, products, vendors, careers, notifications, and platform settings.",
  applicationName: "BitnBolt Admin",
  authors: [{ name: "BitnBolt" }],
  creator: "BitnBolt",
  publisher: "BitnBolt",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
  openGraph: {
    title: "BitnBolt Admin",
    description: "Internal admin console for BitnBolt.",
    url: "https://admin.bitnbolt.in",
    siteName: "BitnBolt Admin",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "BitnBolt Admin",
    description: "Internal admin console for BitnBolt.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dc2626",
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
        {children}
      </body>
    </html>
  );
}
