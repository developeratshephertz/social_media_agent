import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Moon, Sun } from 'lucide-react';

function PageTitleFromPath({ }) {
  const loc = useLocation();
  const map = {
    '/dashboard': 'Dashboard',
    '/create': 'Create Campaign',
    '/campaigns': 'My Campaigns',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
    '/pricing': 'Pricing',
  };
  return <div className="text-lg font-semibold">{map[loc.pathname] || 'Dashboard'}</div>;
}

export default function AppTopbar() {
  const [isDark, setIsDark] = useState(false);

  // Simple theme toggle
  const toggleTheme = () => {
    console.log('Theme button clicked!');
    const newTheme = !isDark;
    setIsDark(newTheme);

    // Apply theme directly to document
    if (newTheme) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      console.log('Applied dark theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      console.log('Applied light theme');
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <PageTitleFromPath />
        <div className="text-sm text-[var(--text-muted)]">Manage campaigns and posts</div>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative block">
          <input aria-label="Global search" className="pl-9 pr-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm w-64 focus-visible:shadow-[var(--ring)]" placeholder="Search campaigns, posts..." />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
        </label>

        <button aria-label="Notifications" className="p-2 rounded-md hover:bg-[var(--bg-muted)]">
          <Bell className="w-5 h-5" />
        </button>

        <button
          onClick={toggleTheme}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 border-4 border-white"
          style={{
            background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
            boxShadow: '0 10px 30px rgba(255, 107, 107, 0.4)'
          }}
        >
          {isDark ? (
            <div className="flex items-center gap-3">
              <Sun className="w-6 h-6" />
              <span>LIGHT MODE</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Moon className="w-6 h-6" />
              <span>DARK MODE</span>
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
