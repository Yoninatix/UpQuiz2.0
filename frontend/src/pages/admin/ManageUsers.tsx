import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { Users, UserX } from 'lucide-react';

interface User { id: string; email: string; first_name: string; last_name: string; role: string; is_active: boolean; }

const roleColors: Record<string, string> = {
  admin:    'bg-violet-100 text-violet-700',
  educator: 'bg-amber-100 text-amber-700',
  student:  'bg-sky-100 text-sky-700',
};

const avatarColors: Record<string, string> = {
  admin:    'from-violet-500 to-purple-600',
  educator: 'from-amber-500 to-orange-500',
  student:  'from-sky-500 to-blue-600',
};

export default function ManageUsers() {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <Layout role="admin">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">Control access, roles, and account status for all users</p>
        </div>
        {users.length > 0 && (
          <div className="card py-2 px-4 text-sm">
            <span className="font-bold text-slate-800">{users.length}</span>
            <span className="text-slate-400 ml-1">users</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}</div>
      ) : users.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No users found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">User</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const initials = `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[u.role] ?? 'from-slate-400 to-slate-500'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {initials}
                        </div>
                        <span className="font-medium text-slate-800">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="td text-slate-500">{u.email}</td>
                    <td className="td">
                      <select
                        value={u.role}
                        onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-primary-300 ${roleColors[u.role] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        <option value="student">Student</option>
                        <option value="educator">Educator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="td">
                      <span className={`badge ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="td">
                      {u.is_active && (
                        <button
                          onClick={() => deactivateMutation.mutate(u.id)}
                          className="btn-danger text-xs py-1.5 px-3"
                        >
                          <UserX className="w-3.5 h-3.5" /> Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
