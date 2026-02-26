import "./globals.css";
import { AuthProvider } from "../lib/contexts/AuthContext";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Urban Leases — Property Management for Modern Landlords",
  description: "Real-time portfolio visibility, automated tenant communication, and smart reporting. Urban Leases turns offline rental assets into a live, manageable dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 overflow-x-hidden">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
