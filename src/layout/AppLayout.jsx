import Sidebar from "./Sidebar.jsx";

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[280px] p-8" role="main">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
