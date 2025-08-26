import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "home" },
  { to: "/create", label: "Create Campaign", icon: "plus" },
  { to: "/campaigns", label: "My Campaigns", icon: "folder" },
  { to: "/analytics", label: "Analytics", icon: "chart" },
  { to: "/settings", label: "Settings", icon: "gear" },
];

function Icon({ name, className }) {
  const base = "w-5 h-5";
  switch (name) {
    case "home":
      return (
        <svg
          className={clsx(base, className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
        </svg>
      );
    case "plus":
      return (
        <svg
          className={clsx(base, className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "folder":
      return (
        <svg
          className={clsx(base, className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "chart":
      return (
        <svg
          className={clsx(base, className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18" />
          <path d="M7 15v-4M12 19V8M17 19v-8" />
        </svg>
      );
    case "gear":
      return (
        <svg
          className={clsx(base, className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 6.4a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51.18.07.37.1.56.1H21a2 2 0 1 1 0 4h-.09c-.19 0-.38.03-.56.1-.61.25-1 .85-1 1.51z" />
        </svg>
      );
    default:
      return null;
  }
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-white border-r border-gray-200 shadow-sm flex flex-col">
      {/* Agent Anywhere Logo */}
      <div className="h-12 flex items-center justify-center px-6 py-2 border-b border-gray-50">
        <img 
          src="/agent-anywhere-logo.png" 
          alt="Agent Anywhere" 
          className="h-8 w-auto"
        />
      </div>
      
      {/* Social Media Agent Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="font-semibold text-lg">Social Media Agent</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="px-2 space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium",
                    isActive || pathname.startsWith(item.to)
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  )
                }
              >
                <Icon
                  name={item.icon}
                  className={clsx(
                    pathname.startsWith(item.to)
                      ? "text-blue-600"
                      : "text-gray-500"
                  )}
                />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Alex Johnson</div>
            <div className="text-xs text-gray-500">alex@example.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
