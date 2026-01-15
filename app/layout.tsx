import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../src/styles/variables.css';

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Barbearia Stayler',
  description: 'Barbearia Premium Management System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Stayler',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-neutral-950 text-white">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body {
            font-family: 'Inter', sans-serif;
            background-color: #0a0a0a;
            color: #ffffff;
          }
          .font-display {
            font-family: 'Playfair Display', serif;
          }
        `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
