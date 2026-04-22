import "./globals.css";

export const metadata = {
  title: "MJ Industrial",
  description: "Sistema de servicio técnico MJ Industrial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MJ Industrial</title>
      </head>
      <body>{children}</body>
    </html>
  );
}