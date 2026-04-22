"use client";

import { useEffect } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registrado:", registration.scope);
          })
          .catch((error) => {
            console.log("Error registrando Service Worker:", error);
          });
      });
    }
  }, []);

  return (
    <html lang="es">
      <head>
        <title>MJ Industrial</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="apple-mobile-web-app-title" content="MJ Industrial" />
        <meta name="mobile-web-app-capable" content="yes" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}