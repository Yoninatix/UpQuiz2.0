import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Clock, Calendar, ChevronRight, BookOpen } from 'lucide-react';

interface Exam { id: string; title: string; status: string; time_limit_minutes: number | null; available_until: string | null; }

export default function MyExamsPage() {
  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ['student-exams'],
    queryFn: () => api.get('/student/exams').then(r => r.data),
  });

  return (
    <Layout role="student">
      <div className="page-header">
        <h1 className="page-title">My Exams</h1>
        <p className="page-subtitle">Exams assigned to your enrolled subjects</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}</div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No exams available</p>
          <p className="text-slate-400 text-sm mt-1">Ask your educator to enroll you in a subject</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(e => (
            <div key={e.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="stat-icon bg-gradient-green w-10 h-10 rounded-xl">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{e.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {e.time_limit_minutes ? `${e.time_limit_minutes} min` : 'No time limit'}
                    </span>
                    {e.available_until && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {new Date(e.available_until).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Link to={`/student/exams/${e.id}/take`}
                className="btn-primary text-sm py-2 px-4 flex-shrink-0">
                Start <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
