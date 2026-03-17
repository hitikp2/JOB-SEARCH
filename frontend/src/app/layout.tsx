import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Agent - AI-Powered Job Matching",
  description:
    "AI-powered job matching system that finds jobs, ranks them against your resume, and sends daily summaries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
