import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useState } from "react";

function Avatar({ address, size = "w-8 h-8", className = "" }) {
  const seed = address ? parseInt(address.slice(2, 8), 16) % 360 : 200;
  return (
    <div className={`${size} avatar shrink-0 ${className}`}
      style={{ background: `hsl(${seed}, 60%, 25%)` }}>
      <span style={{ color: `hsl(${seed}, 80%, 70%)` }}>
        {address ? address.slice(2, 4).toUpperCase() : "??"}
      </span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { address }      = useWeb3();
  const navigate         = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/feed",    icon: "⚡", label: "Feed" },
    { to: "/explore", icon: "🔍", label: "Explore" },
    { to: "/groups",  icon: "👥", label: "Groups" },
    { to: "/messages",icon: "💬", label: "Messages" },
    { to: `/profile/${address}`, icon: "👤", label: "Profile" },
    { to: "/settings",icon: "⚙️", label: "Settings" },
  ];

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass border-r border-dark-600 fixed h-full z-40 p-4">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold font-display">DS</div>
          <span className="font-display font-bold text-xl gradient-text">SocioChain</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="card mt-4 p-3">
          <div className="flex items-center gap-3">
            <Avatar address={address} size="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-display font-medium truncate">
                {user?.username || "Anonymous"}
              </p>
              <p className="text-gray-500 text-xs font-mono truncate">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }}
            className="mt-3 w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20
                       border border-transparent hover:border-red-900/40
                       rounded-lg py-1.5 transition-all">
            Disconnect
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden glass border-b border-dark-600 fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold font-display text-xs">DS</div>
          <span className="font-display font-bold gradient-text">SocioChain</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white p-1">
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14 glass">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <span>{item.icon}</span>{item.label}
              </NavLink>
            ))}
            <button onClick={() => { logout(); navigate("/"); }}
              className="nav-link text-red-400 w-full text-left">
              🚪 Disconnect
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export { Avatar };
