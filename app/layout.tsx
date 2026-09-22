import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Mesita Virtual — Cronopios",
  description: "Herramientas para estudiantes de la Facultad de Artes UNLP: recorrido académico, agenda y guía de cátedras.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/mesita.svg", apple: "/icons/mesita.svg" }
};

export const viewport: Viewport = { themeColor: "#FE26A7" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${inter.variable} ${space.variable} font-sans`}><ServiceWorkerRegistration />{children}</body></html>;
}
