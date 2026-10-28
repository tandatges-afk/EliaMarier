import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/components/elia-uiux-v3.css';
import '@/components/elia-uiux-v2.css';

export const metadata: Metadata = {
  title: 'Élia Marier',
  icons: { icon: '/logo-mark.png', apple: '/logo-mark.png' },
  description: 'Điều hành lịch quay chụp, đội ngũ, sản phẩm và hoạt động studio.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className="elia-ui-v3">{children}</body></html>;
}
