"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Activity,
  ArrowRightLeft,
  Users,
  BarChart3,
  Calendar,
  Menu,
  X,
  Gem,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Live Points", href: "/live-points", icon: Activity },
  { name: "Team Planner", href: "/transfer-planner", icon: ArrowRightLeft },
  { name: "Players", href: "/players", icon: Users },
  { name: "Fixtures", href: "/fixtures", icon: Calendar },
  { name: "Gems", href: "/gems", icon: Gem },
  { name: "Statistics", href: "/statistics", icon: BarChart3 },
];

export default function Layout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FPL</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  FPL Hub
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        : "text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-purple-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-700"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        : "text-gray-600 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 FPL Hub. Data provided by the Fantasy Premier League API.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="https://fantasy.premierleague.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
              >
                Official FPL Site
              </a>
              <a
                href="https://www.premierleague.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
              >
                Premier League
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
