import Sidebar from "./Sidebar.jsx";
import Footer from "../components/ui/Footer.jsx";
import UserMenu from "../components/ui/UserMenu.jsx";
import CalendarPicker from "../components/ui/CalendarPicker.jsx";

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main" className="flex-1 ml-[280px] relative" role="main">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-6">
          {/* Top header: search + actions */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4 w-full max-w-3xl">
              <div className="glass p-2 rounded-2xl flex items-center gap-2 w-full">
                <svg className="w-5 h-5 text-[var(--text-muted)] ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  placeholder="Search campaigns, posts..."
                  className="bg-transparent placeholder-[var(--text-muted)] text-[var(--text)] w-full px-3 py-2 focus-visible-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UserMenu />
            </div>
          </div>

          {/* Glass morphism content wrapper */}
          <div className="glass rounded-3xl p-6 md:p-8 min-h-[calc(100vh-8rem)] animate-slide-in">
            {children}
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AppLayout;


