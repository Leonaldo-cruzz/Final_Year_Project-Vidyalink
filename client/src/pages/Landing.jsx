import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-900">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/20 to-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="text-xs font-semibold text-indigo-300 tracking-wide">
              VidyaLink Academic Platform v1.0 Live
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Empowering Higher Education with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300">
              Connected Auth
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            The next-generation campus network connecting Students, Faculty, Alumni, and Recruiters through secure enterprise-grade authentication.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 group"
              >
                <span>Go to Dashboard ({user?.fullName?.split(' ')[0]})</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 group"
                >
                  <span>Get Started Now</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold hover:bg-slate-800/80 transition-all text-center"
                >
                  Sign In to Account
                </Link>
              </>
            )}
          </div>

          {/* Key Stats Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-900 pt-10">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-white tracking-tight">50+</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Partner Institutions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-indigo-400 tracking-tight">10k+</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Verified Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-cyan-400 tracking-tight">99.9%</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Token Security Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">5 Roles</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Granular RBAC Engine</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Enterprise Infrastructure
            </h2>
            <p className="text-3xl font-bold text-white mt-2">
              Built for Security, Reliability & Scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">JWT Dual-Token Security</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Short-lived access tokens stored securely in memory combined with HTTP-Only refresh cookies with cryptographic hashing.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Role-Based Access Control</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Granular middleware protection enforcing permissions for Students, Faculty, Alumni, Recruiters, and Admins.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Silent Token Refresh</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Seamless user experience with background Axios interceptors automatically renewing expired credentials without logging you out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Ecosystem Roles
            </h2>
            <p className="text-3xl font-bold text-white mt-2">
              Designed for All Campus Stakeholders
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                role: 'Student',
                desc: 'Build verified portfolios, showcase academic projects, and connect with faculty and recruiters.',
                badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              },
              {
                role: 'Faculty',
                desc: 'Guide student projects, verify academic accomplishments, and collaborate on campus research.',
                badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              },
              {
                role: 'Alumni',
                desc: 'Give back through mentorship, share industry insights, and network with upcoming graduates.',
                badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              },
              {
                role: 'Recruiter',
                desc: 'Discover top verified student talent, review verified skills, and streamline campus hiring.',
                badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-4 ${item.badge}`}>
                    {item.role}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
                </div>
                <Link
                  to="/register"
                  className="mt-6 inline-flex items-center text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  Join as {item.role} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Landing;
