import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Midforge — Your Revenue Is Your Power',
  description:
    'A retro 2D multiplayer RPG where indie hackers level up using real verified data. Connect Stripe + X. Watch your character evolve.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Midforge" />
        <meta name="theme-color" content="#F39C12" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
