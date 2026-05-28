import { RootProvider } from 'fumadocs-ui/provider/next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './global.css';

const switzer = localFont({
  src: [
    {
      path: '../../public/fonts/Switzer-Variable.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Switzer-VariableItalic.woff2',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-switzer',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${switzer.variable} ${geistMono.variable}`}
    >
      <body className="flex flex-col min-h-screen font-sans antialiased">
        <RootProvider theme={{ defaultTheme: 'dark' }}>{children}</RootProvider>
      </body>
    </html>
  );
}
