import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import {
  LayoutDashboard, Users, BookOpen, FileText, Sparkles,
  ClipboardCheck, BarChart2, LogOut, GraduationCap,
  Shield, ChevronRight,
} from 'lucide-react';

interface Props {
  children: ReactNode;
  role: 'admin' | 'educator' | 'student';
}

const navConfig = {
  admin: [
    { to: '/admin',       label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users',     icon: Users },
  ],
  educator: [
    { to: '/educator',          label: 'Dashboard', icon: LayoutDashboard },
    { to: '/educator/subjects', label: 'Subjects',  icon: BookOpen },
  ],
  student: [
    { to: '/student',       label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/exams', label: 'My Exams',  icon: ClipboardCheck },
  ],
};

const roleColors = {
  admin:    'from-rose-500 to-pink-600',
  educator: 'from-primary-600 to-accent-600',
  student:  'from-emerald-500 to-teal-600',
};

const roleIcons = {
  admin:    Shield,
  educator: GraduationCap,
  student:  BookOpen,
};

const roleBadge = {
  admin:    'bg-rose-100 text-rose-700',
  educator: 'bg-primary-100 text-primary-700',
  student:  'bg-emerald-100 text-emerald-700',
};

export default function Layout({ children, role }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const RoleIcon = roleIcons[role];

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Navbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200 shadow-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to={`/${role}`} className="flex items-center gap-2.5 group">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[role]} flex items-center justify-center shadow-md group-hover:shadow-glow transition-shadow duration-200`}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gradient">UpQuiz</span>
            </Link>

            {/* Nav links */}
            <nav className="hidden sm:flex items-center gap-1">
              {navConfig[role].map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
                      ${active
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColors[role]} flex items-center justify-center shadow-sm`}>
                  <span className="text-xs font-bold text-white">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <div className="leading-none">
                  <p className="text-sm font-medium text-slate-800">{user?.first_name} {user?.last_name}</p>
                  <span className={`badge mt-0.5 ${roleBadge[role]} capitalize`}>
                    <RoleIcon className="w-3 h-3" />
                    {role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 animate-fade-in">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-4">
        <p className="text-center text-xs text-slate-400">
          UpQuiz · AI-Powered Exam Platform
        </p>
      </footer>
    </div>
  );
}
