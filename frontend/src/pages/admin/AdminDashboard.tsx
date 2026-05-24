import Layout from '../../components/Layout';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Users, Shield, GraduationCap, BookOpen, ChevronRight, Settings } from 'lucide-react';

interface UserStats { total: number; admins: number; educators: number; students: number; }

export default function AdminDashboard() {
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const stats: UserStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    educators: users.filter(u => u.role === 'educator').length,
    students: users.filter(u => u.role === 'student').length,
  };

  return (
    <Layout role="admin">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 mb-8 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10">
          <p className="text-violet-200 text-sm font-medium mb-1">Administration Panel</p>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-violet-200 max-w-md">
            Manage users, assign roles, and oversee the entire UpQuiz platform.
          </p>
        </div>
        <div className="absolute bottom-4 right-8 opacity-10">
          <Settings className="w-32 h-32 text-white" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'bg-gradient-to-br from-violet-500 to-purple-600' },
          { label: 'Admins', value: stats.admins, icon: Shield, color: 'bg-gradient-to-br from-rose-500 to-pink-600' },
          { label: 'Educators', value: stats.educators, icon: BookOpen, color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
          { label: 'Students', value: stats.students, icon: GraduationCap, color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-4">Administration</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/users" className="card-hover flex items-center gap-4">
          <div className="stat-icon bg-gradient-to-br from-violet-500 to-purple-600">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Manage Users</p>
            <p className="text-slate-500 text-xs mt-0.5">View, activate, deactivate, and assign roles</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
      </div>
    </Layout>
  );
}
