import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { User, Shield, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xl">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Welcome to Dashboard</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Authenticated as <span className="text-indigo-300 font-semibold">{user?.email}</span> ({user?.role})
              </p>
            </div>
          </div>
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Session Active</span>
          </span>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:col-span-2">
            <h2 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>User Profile Placeholder</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Full Name</span>
                <span className="font-semibold text-slate-200">{user?.fullName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Email Address</span>
                <span className="font-semibold text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Assigned Role</span>
                <span className="font-semibold text-indigo-400 uppercase">{user?.role}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Account Status</span>
                <span className="font-semibold text-emerald-400">Active</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>System Status</span>
            </h2>

            <div className="space-y-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Frontend Routing</div>
                <div>React Router DOM configured with ProtectedRoute</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Auth Context</div>
                <div>State initialized in AuthProvider</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
