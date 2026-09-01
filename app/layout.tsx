import type { Metadata } from 'next';
import './globals.css';
import { SiteFooter } from '@/components/branding/SiteFooter';

export const metadata: Metadata = {
  title: 'Grand Medical Care - Membership Cards',
  description: 'Grand Medical Care membership card management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-app text-slate-900">
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
