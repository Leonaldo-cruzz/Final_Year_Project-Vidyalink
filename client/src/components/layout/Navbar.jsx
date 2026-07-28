import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Menu, X, LayoutDashboard, Home, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { isAuthenticated, user, logout, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-indigo-400 ${
      isActive ? 'text-indigo-400 font-semibold' : 'text-slate-300'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-slate-100 tracking-tight">
              Vidya<span className="text-indigo-400">Link</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">
                    {user?.fullName || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-500/40 text-xs font-semibold text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                <NavLink
                  to="/login"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  Register
                </NavLink>
              </div>
            )}

            {/* Dev toggle helper */}
            <button
              onClick={() => setIsAuthenticated(!isAuthenticated)}
              title="Dev toggle auth state"
              className="text-[10px] uppercase font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300"
            >
              Auth: {isAuthenticated ? 'ON' : 'OFF'}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-3">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-indigo-400 py-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 text-sm text-indigo-400 font-semibold py-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center space-x-2 text-sm text-red-400 hover:text-red-300 py-1.5 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col space-y-2">
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 text-sm font-semibold text-slate-200 bg-slate-900 py-2 rounded-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </NavLink>
              <NavLink
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 text-sm font-semibold text-white bg-indigo-600 py-2 rounded-lg"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </NavLink>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
