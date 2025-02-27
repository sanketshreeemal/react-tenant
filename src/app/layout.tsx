import "./globals.css";
import { AuthProvider } from "../lib/contexts/AuthContext";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Tenant Management System",
  description: "A comprehensive system for managing tenants, leases, and rent payments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
