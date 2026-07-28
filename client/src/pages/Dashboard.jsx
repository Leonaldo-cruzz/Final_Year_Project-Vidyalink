import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Dashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefreshUser = async () => {
    setRefreshing(true);
    await refreshUser();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'student':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'faculty':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'alumni':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'recruiter':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'admin':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center space-x-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white font-extrabold text-2xl">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Welcome, {user?.fullName}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Authenticated session active • {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 relative z-10 w-full md:w-auto">
            <button
              onClick={handleRefreshUser}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-2"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all shadow-lg shadow-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Details Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 lg:col-span-2 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>User Account Details</span>
              </h2>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="capitalize">{user?.status || 'Active'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Full Name
                </span>
                <span className="text-sm font-medium text-slate-100">{user?.fullName || 'N/A'}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Email Address
                </span>
                <span className="text-sm font-medium text-slate-100">{user?.email || 'N/A'}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Assigned Role
                </span>
                <span className="text-sm font-bold text-indigo-400 uppercase tracking-wide">{user?.role || 'student'}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Account ID
                </span>
                <span className="text-xs font-mono text-slate-400">{user?._id || 'N/A'}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Institution / College
                </span>
                <span className="text-sm font-medium text-slate-200">{user?.college || 'Not specified'}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Branch / Department
                </span>
                <span className="text-sm font-medium text-slate-200">{user?.branch || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Security & Token Info Card */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Security Engine</span>
              </h2>

              <ul className="space-y-3 text-xs">
                <li className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">JWT Access Token</span>
                  <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active (Memory)
                  </span>
                </li>
                <li className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Refresh Token Cookie</span>
                  <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    HTTP-Only / Lax
                  </span>
                </li>
                <li className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Silent Auto-Refresh</span>
                  <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Axios Interceptor
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
