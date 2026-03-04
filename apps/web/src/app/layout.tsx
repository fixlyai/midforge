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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
