import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windows Casino - Roulette",
  description: "Windows ME style roulette game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
