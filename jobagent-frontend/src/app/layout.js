import './globals.css';

export const metadata = {
  title: 'Job Agent – AI Job Matching',
  description: 'AI-powered job matching agent that finds and delivers your best opportunities daily.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
