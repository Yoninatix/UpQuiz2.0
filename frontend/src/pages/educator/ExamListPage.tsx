import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { Plus, Clock, Globe, Lock, FileEdit, Send, X } from 'lucide-react';

interface Exam { id: string; title: string; status: string; time_limit_minutes: number | null; created_at: string; }

const statusConfig = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600', icon: FileEdit },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700', icon: Globe },
  closed:    { label: 'Closed',    color: 'bg-red-100 text-red-600',     icon: Lock },
};

export default function ExamListPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const qc = useQueryClient();

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ['exams', subjectId],
    queryFn: () => api.get(`/exams?subject_id=${subjectId}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/exams/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams', subjectId] }),
  });

  return (
    <Layout role="educator">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Exams</h1>
          <p className="page-subtitle">Build and publish exams from your approved questions</p>
        </div>
        <Link to={`/educator/subjects/${subjectId}/exams/create`} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Exam
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}</div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No exams yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first exam from approved questions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(e => {
            const cfg = statusConfig[e.status as keyof typeof statusConfig] ?? statusConfig.draft;
            const StatusIcon = cfg.icon;
            return (
              <div key={e.id} className="card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <StatusIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{e.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {e.time_limit_minutes ? `${e.time_limit_minutes} min` : 'No limit'}
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge ${cfg.color}`}><StatusIcon className="w-3 h-3" /> {cfg.label}</span>

                  {e.status === 'draft' && (
                    <button onClick={() => statusMutation.mutate({ id: e.id, status: 'published' })}
                      className="btn-success text-xs py-1.5 px-3">
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  {e.status === 'published' && (
                    <button onClick={() => statusMutation.mutate({ id: e.id, status: 'closed' })}
                      className="btn-secondary text-xs py-1.5 px-3">
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
