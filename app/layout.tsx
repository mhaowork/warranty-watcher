import type { Metadata } from 'next';
import Link from 'next/link';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';
import { Button } from '../components/ui/button';
import ClientFooter from '../components/ClientFooter';
import { isSaaSMode } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Warranty Watcher',
  description: 'A warranty information management system for IT professionals',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="flex flex-col min-h-screen">
          <header className="py-6 px-4 md:px-8 bg-white border-b">
            <div className="container mx-auto flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold">Warranty Watcher</Link>
              <nav>
                <ul className="flex space-x-4">
                  <li>
                    <Link href="/">
                      <Button variant="ghost">Home</Button>
                    </Link>
                  </li>
                  <li>
                    <Link href="/config">
                      <Button variant="ghost">Configuration</Button>
                    </Link>
                  </li>
                  <li>
                    <Link href="/reports/lifecycle">
                      <Button variant="ghost">Reports</Button>
                    </Link>
                  </li>
                  {!isSaaSMode() && (
                    <li>
                      <Link href="/logs">
                        <Button variant="ghost">Logs</Button>
                      </Link>
                    </li>
                  )}
                  {isSaaSMode() && (
                  <li>
                    <Link href="/billing">
                      <Button variant="ghost">Billing</Button>
                    </Link>
                    </li>
                  )}
                </ul>
              </nav>
            </div>
          </header>
          
          <main className="flex-1">
            <NuqsAdapter>
              {children}
            </NuqsAdapter>
          </main>
          
          <ClientFooter />
        </div>
      </body>
    </html>
  );
} 