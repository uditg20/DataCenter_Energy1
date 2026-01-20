import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Center + BESS Optimizer",
  description: "Grid-interactive data center sizing and dispatch optimizer with Pareto frontier."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans">
        {children}
      </body>
    </html>
  );
}
