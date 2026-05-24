import Layout from '../../components/Layout';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BookOpen, Sparkles, ClipboardCheck, BarChart2, ChevronRight, Zap } from 'lucide-react';

const cards = [
  {
    label: 'Subjects & Materials',
    desc: 'Create subjects and upload PDF learning materials for processing.',
    to: '/educator/subjects',
    icon: BookOpen,
    gradient: 'bg-gradient-blue',
    badge: 'Step 1',
  },
  {
    label: 'Generate Questions',
    desc: 'Use the RAG pipeline to auto-generate exam questions from your PDFs.',
    to: '/educator/subjects',
    icon: Sparkles,
    gradient: 'bg-gradient-card',
    badge: 'AI-Powered',
  },
  {
    label: 'Manage Exams',
    desc: 'Build, configure, and publish exams from your approved question bank.',
    to: '/educator/subjects',
    icon: ClipboardCheck,
    gradient: 'bg-gradient-green',
    badge: 'Step 3',
  },
  {
    label: 'Analytics',
    desc: 'View class performance, weak topics, and student score breakdowns.',
    to: '/educator/subjects',
    icon: BarChart2,
    gradient: 'bg-gradient-gold',
    badge: 'Insights',
  },
];

export default function EducatorDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <Layout role="educator">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 mb-8 shadow-glow">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-64 h-32 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">Educator Portal</p>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="text-primary-200 max-w-md">
              Create smarter exams with AI — upload materials, generate questions, and track student progress.
            </p>
          </div>
          <div className="hidden md:flex w-20 h-20 rounded-3xl bg-white/15 backdrop-blur items-center justify-center">
            <Zap className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to}
              className="group card-hover flex items-start gap-4 overflow-hidden relative"
            >
              {/* colored icon */}
              <div className={`stat-icon ${c.gradient} flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm">{c.label}</span>
                  <span className="badge bg-primary-50 text-primary-600 text-xs">{c.badge}</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{c.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
            </Link>
          );
        })}
      </div>

      {/* Tip box */}
      <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50 px-5 py-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary-800">Getting started</p>
          <p className="text-xs text-primary-600 mt-0.5">
            Start by creating a <strong>Subject</strong>, then upload a PDF. Once processed, hit{' '}
            <strong>Generate Questions</strong> and the AI will retrieve relevant content from your materials.
          </p>
        </div>
      </div>
    </Layout>
  );
}
