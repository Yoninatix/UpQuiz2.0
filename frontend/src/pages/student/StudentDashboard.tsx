import Layout from '../../components/Layout';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ClipboardCheck, Trophy, ChevronRight, Star } from 'lucide-react';

export default function StudentDashboard() {
  const user = useAuthStore(s => s.user);

  return (
    <Layout role="student">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 mb-8 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10">
          <p className="text-emerald-100 text-sm font-medium mb-1">Student Portal</p>
          <h1 className="text-3xl font-bold text-white mb-2">Hello, {user?.first_name}!</h1>
          <p className="text-emerald-100 max-w-md">
            View your assigned exams, track your scores, and identify areas to improve.
          </p>
        </div>
        <div className="absolute bottom-4 right-8 opacity-10">
          <Star className="w-32 h-32 text-white" />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/student/exams" className="card-hover flex items-center gap-4">
          <div className="stat-icon bg-gradient-green">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">My Exams</p>
            <p className="text-slate-500 text-xs mt-0.5">View and take your assigned exams</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>

        <div className="card border-dashed flex items-center gap-4 opacity-60 select-none">
          <div className="stat-icon bg-gradient-gold">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Results</p>
            <p className="text-slate-500 text-xs mt-0.5">Available after submitting exams</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
