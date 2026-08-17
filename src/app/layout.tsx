import type { Metadata, Viewport } from 'next';
import { ThemeProvider, themeScript } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inventario FCEE · UAGRM',
  description:
    'Sistema de Gestión de Inventarios de la Facultad de Ciencias Económicas y Empresariales — Universidad Autónoma Gabriel René Moreno.',
  icons: { icon: '/logo-fcee.png', apple: '/logo-fcee.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#13294B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
