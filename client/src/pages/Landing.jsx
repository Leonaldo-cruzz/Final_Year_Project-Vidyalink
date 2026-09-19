import React from 'react';
import { ArrowRight, Check, CircleCheck, FileCheck2, FolderKanban, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { ROLE_ROUTE_MAP, ROUTES } from '@/constants';

const ROLE_CARDS = [
  {
    label: 'Students',
    title: 'Build evidence of what you can actually do.',
    body: 'Turn projects, certificates, GitHub work, and a resume into a verified academic record that employers can trust.',
    icon: FolderKanban,
  },
  {
    label: 'Faculty',
    title: 'Verify student progress with academic context.',
    body: 'Review capstones, evaluate project deliverables, and attach authoritative institutional verification directly to the student’s work.',
    icon: FileCheck2,
  },
  {
    label: 'Recruiters & Alumni',
    title: 'Discover talent from verified evidence.',
    body: 'Evaluate candidates with genuine skill signals, schedule interviews, and mentor upcoming engineers with company referrals.',
    icon: Users,
  },
];

const RECORD_ROWS = [
  { label: 'Project Portfolio', value: '3 Active Projects', status: 'Faculty Verified' },
  { label: 'AI Skill Evaluation', value: 'Distributed Systems & PyTorch', status: 'Industry Ready' },
  { label: 'Academic Credentials', value: 'Resume + Verified GitHub', status: 'Ready to Share' },
];

const Landing = () => {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = ROLE_ROUTE_MAP[user?.role] || ROUTES.STUDENT_DASHBOARD;

  return (
    <div className="public-shell flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-800/80 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="max-w-3xl">
              <p className="eyebrow">The Academic Network for Verifiable Work</p>
              <h1 className="display-title mt-5 text-[#f5f1e9]">
                Build evidence of what you can actually do.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
                VidyaLink connects student projects, faculty verification, AI skill analysis, and campus recruitment into one verified academic record — letting your actual work speak first.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={isAuthenticated ? dashboardPath : ROUTES.REGISTER}
                  className="primary-action rounded-md"
                >
                  {isAuthenticated ? 'Open your dashboard' : 'Create your account'}{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a href="#features" className="secondary-action rounded-md text-slate-200">
                  See how it connects <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
              <p className="mt-5 text-xs text-slate-500">
                For students, faculty, recruiters, and alumni who believe accomplishments should be proven, not just stated.
              </p>
            </div>

            {/* Illustrative Record Card */}
            <div
              className="ink-panel relative overflow-hidden rounded-xl p-5 shadow-[0_18px_42px_rgb(0_0_0_/_0.18)] sm:p-7"
              aria-label="Illustration of a verified academic record"
            >
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-200">
                    Verified Academic Record
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-100">
                    Candidate Dossier · Computer Science & Engineering
                  </p>
                </div>
                <span
                  className="status-badge status-badge-sm flex items-center gap-1"
                  style={{ '--badge-tone': 'var(--color-success)' }}
                >
                  <CircleCheck className="h-3 w-3" /> Faculty Verified
                </span>
              </div>
              <div className="space-y-3 py-5">
                {RECORD_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-800/80 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200">{row.label}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{row.value}</p>
                    </div>
                    <span className="self-start text-right text-[10px] font-bold uppercase tracking-[0.12em] text-orange-200">
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 border-t border-slate-700/80 pt-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-300/10 text-orange-200">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Authentic proof verified by university faculty. Context that makes candidate introductions useful.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid: Full Official Product Scope */}
        <section id="features" className="public-panel px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="eyebrow">End-to-End Academic Validation</p>
              <h2 className="serif-heading mt-3 text-4xl sm:text-5xl">
                The proof should travel with the work.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#6d767c]">
                VidyaLink unifies projects, certificates, faculty reviews, AI skill evaluation, and career opportunities into an evidence-led academic network.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden border border-[#ddd8ce] bg-[#ddd8ce] md:grid-cols-3">
              {[
                ['01', 'Portfolio & Evidence', 'Turn project code, certificates, GitHub commits, and resumes into a unified, shareable portfolio.'],
                ['02', 'Faculty Verification', 'Professors evaluate student project deliverables and attach institutional verification directly to the achievements.'],
                ['03', 'AI Evaluation & Readiness', 'Automated skill extraction and readiness analysis help students assess candidate market fit.'],
                ['04', 'Recruiter Discovery', 'Hiring partners search and shortlist talent based on verifiable evidence rather than unbacked claims.'],
                ['05', 'Alumni Mentorship', 'Graduates review student capstones, conduct 1:1 mentorship, and sponsor company referrals.'],
                ['06', 'Authentic Trust', 'Permanent institutional verification records that give employers high-confidence signals.'],
              ].map(([number, title, body]) => (
                <article key={number} className="bg-[#fffdf8] p-7 sm:p-8">
                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#c98254]">{number}</p>
                  <h3 className="mt-8 text-xl font-extrabold text-[#111820]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#6d767c]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="bg-[#e9e3d8] px-4 py-20 text-[#111820] sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="eyebrow">Built around the people involved</p>
              <h2 className="serif-heading mt-3 text-4xl sm:text-5xl">
                Different roles. Shared context.
              </h2>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {ROLE_CARDS.map(({ label, title, body, icon: Icon }) => (
                <article key={label} className="border-t-2 border-[#c98254] pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#a9603b]">{label}</p>
                    <Icon className="h-5 w-5 text-[#a9603b]" />
                  </div>
                  <h3 className="mt-8 text-2xl font-extrabold leading-tight">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#6d767c]">{body}</p>
                  <Link
                    to={ROUTES.REGISTER}
                    className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#a9603b] hover:text-[#7f452b]"
                  >
                    Join VidyaLink <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
