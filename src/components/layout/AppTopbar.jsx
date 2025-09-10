import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';

function PageTitleFromPath({}) {
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
  const { theme, setTheme } = useTheme();

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      const html = document.documentElement; const body = document.body;
      html.setAttribute('data-theme', next); html.classList.remove('light', 'dark'); html.classList.add(next);
      body.classList.remove('light', 'dark'); body.classList.add(next);
      localStorage.setItem('theme', next);
    } catch (e) {}
  }

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

        <button aria-label="Toggle theme" onClick={toggleTheme} className="p-2 rounded-md hover:bg-[var(--bg-muted)]" title="Toggle theme">
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
