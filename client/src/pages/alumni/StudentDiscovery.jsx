import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import alumniService from '@/services/alumniService';
import {
  Search, Filter, CheckCircle2, Award, FolderKanban,
  GraduationCap, Sparkles, ArrowRight, X, UserCheck, Eye,
} from 'lucide-react';

const StudentDiscovery = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters state
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [page, skillFilter, branchFilter, yearFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const query = {
        page,
        limit: 9,
        search: search.trim() || undefined,
        skills: skillFilter || undefined,
        branch: branchFilter || undefined,
        graduationYear: yearFilter || undefined,
      };

      const result = await alumniService.searchStudents(query);
      let list = result.students || [];
      if (verifiedOnly) {
        list = list.filter((s) => s.isPortfolioVerified);
      }
      setStudents(list);
      setTotal(result.total || list.length);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSkillFilter('');
    setBranchFilter('');
    setYearFilter('');
    setVerifiedOnly(false);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Student Discovery Hub</h1>
            <p className="text-slate-400 text-sm mt-1">
              Find verified student talent, review real project milestones, and offer mentorship or referrals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold">
              {total} Verified Students Found
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <Input
                className="pl-10"
                placeholder="Search by student name, college, email, or domain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary">
              <Search className="w-4 h-4 mr-1.5" /> Search
            </Button>
          </form>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div>
              <select
                value={skillFilter}
                onChange={(e) => {
                  setSkillFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Skills</option>
                <option value="React">React.js / Frontend</option>
                <option value="Node.js">Node.js / Express</option>
                <option value="Python">Python / Machine Learning</option>
                <option value="System Design">System Design</option>
                <option value="Cloud">AWS / Cloud DevOps</option>
              </select>
            </div>

            <div>
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Branches / Degrees</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics">Electronics & Comm.</option>
              </select>
            </div>

            <div>
              <select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Graduation Years</option>
                <option value="2025">Class of 2025</option>
                <option value="2026">Class of 2026</option>
                <option value="2027">Class of 2027</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700"
                />
                Verified Portfolios Only
              </label>

              {(search || skillFilter || branchFilter || yearFilter || verifiedOnly) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Student Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm">
            {error}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No students matched your criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your search terms or clearing skill filters to discover other candidates.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={handleClearFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((st) => (
              <div
                key={st._id}
                className="group relative p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top user badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={st.fullName} size="lg" />
                      <div>
                        <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                          {st.fullName}
                        </h3>
                        <p className="text-xs text-slate-400">{st.college || 'Engineering Institute'}</p>
                        <p className="text-[11px] text-slate-500">
                          {st.branch} {st.graduationYear ? `• '${String(st.graduationYear).slice(2)}` : ''}
                        </p>
                      </div>
                    </div>

                    {st.isPortfolioVerified && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold"
                        title="Faculty Verified Portfolio"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Readiness Score & Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 mb-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Readiness</span>
                      <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> {st.industryReadinessScore}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Projects</span>
                      <p className="text-xs font-bold text-blue-400 flex items-center justify-center gap-0.5">
                        <FolderKanban className="w-3 h-3" /> {st.projectCount || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Certs</span>
                      <p className="text-xs font-bold text-purple-400 flex items-center justify-center gap-0.5">
                        <Award className="w-3 h-3" /> {st.verifiedCertificateCount || 0}
                      </p>
                    </div>
                  </div>

                  {/* Skills Pills */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Top Skills</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-16 overflow-hidden">
                      {(st.skills || []).slice(0, 5).map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700"
                        >
                          {sk}
                        </span>
                      ))}
                      {(st.skills || []).length > 5 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                          +{(st.skills || []).length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action CTA */}
                <div className="pt-3 border-t border-slate-800/80">
                  <Button
                    variant="primary"
                    className="w-full justify-center group-hover:shadow-lg group-hover:shadow-amber-500/20"
                    onClick={() => navigate(`/alumni/students/${st._id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    View Student Portfolio
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDiscovery;
