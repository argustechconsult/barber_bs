import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Barbearia Stayler',
  description: 'Barbearia Premium Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="https://cdn.tailwindcss.com" async></script>
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
