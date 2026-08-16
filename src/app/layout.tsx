import type { Metadata } from 'next';
import { Familjen_Grotesk, Newsreader } from 'next/font/google';
import './globals.css';

const ui = Familjen_Grotesk({ subsets: ['latin'], variable: '--font-ui' });
const display = Newsreader({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Gold Star Books',
  description:
    'Personalised reading-practice books for children with Down syndrome, written to the level they actually read at.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable}`}>
      <body className="bg-sand font-ui text-ink antialiased">{children}</body>
    </html>
  );
}
