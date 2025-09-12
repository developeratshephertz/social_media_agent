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
          {/* Top header: user menu only */}
          <div className="mb-6 flex items-center justify-end">
            <div className="flex items-center gap-3">
              <UserMenu />
            </div>
          </div>

          {/* Glass morphism content wrapper */}
          <div className="glass rounded-3xl p-6 md:p-8 min-h-[calc(100vh-8rem)] animate-slide-in flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AppLayout;


