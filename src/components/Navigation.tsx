"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/hooks/useAuth";
import Image from 'next/image';

// Icons
import { 
  Home, 
  Users, 
  FileText, 
  DollarSign, 
  BarChart2, 
  Mail, 
  MessageSquare, 
  FileImage, 
  LogOut, 
  Menu, 
  X,
  Building
} from "lucide-react";

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Tenants", href: "/dashboard/tenants", icon: Users },
    { name: "Rental Inventory", href: "/dashboard/rental-inventory", icon: Building },
    { name: "Rent", href: "/dashboard/rent", icon: DollarSign },
    // Development Phase Features
    // { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    // { name: "Email Notifications", href: "/dashboard/email", icon: Mail },
    // { name: "WhatsApp Messaging", href: "/dashboard/whatsapp", icon: MessageSquare },
    // { name: "Documents", href: "/dashboard/documents", icon: FileImage },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md bg-white shadow-md"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-white shadow-md fixed">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Tenant Management</h2>
        </div>

        {user && (
          <div className="p-4 border-b flex items-center space-x-3">
            <Image
              src={user.photoURL || "https://via.placeholder.com/40"}
              alt="Profile"
              className="h-10 w-10 rounded-full"
              width={40}
              height={40}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">{user.displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={signOut}
            className="flex items-center space-x-3 p-2 w-full rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu */}
      <div
        className={`md:hidden fixed inset-0 bg-gray-800 bg-opacity-50 z-40 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobileMenu}
      ></div>

      <aside
        className={`md:hidden fixed top-0 left-0 w-64 h-screen bg-white shadow-md z-50 transform transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Tenant Management</h2>
        </div>

        {user && (
          <div className="p-4 border-b flex items-center space-x-3">
            <Image
              src={user.photoURL || "https://via.placeholder.com/40"}
              alt="Profile"
              className="h-10 w-10 rounded-full"
              width={40}
              height={40}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">{user.displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={toggleMobileMenu}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={() => {
              signOut();
              toggleMobileMenu();
            }}
            className="flex items-center space-x-3 p-2 w-full rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
} 