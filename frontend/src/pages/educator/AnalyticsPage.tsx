import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, Target, BarChart2 } from 'lucide-react';

interface Analytics {
  average_score: number;
  attempt_count: number;
  topic_breakdown: { topic_tag: string; correct: number; total: number }[];
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#7c3aed', '#4f46e5', '#818cf8'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card px-3 py-2.5 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-primary-600 font-bold">{payload[0].value}% accuracy</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();

  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ['analytics', subjectId],
    queryFn: () => api.get(`/analytics/subject/${subjectId}`).then(r => r.data),
  });

  const chartData = (data?.topic_breakdown ?? []).map(t => ({
    name: t.topic_tag,
    accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    correct: t.correct,
    total: t.total,
  }));

  return (
    <Layout role="educator">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Track student performance and identify weak areas</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}
          </div>
          <div className="card h-80 animate-pulse bg-slate-100" />
        </div>
      ) : !data || data.attempt_count === 0 ? (
        <div className="card text-center py-16">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No data yet</p>
          <p className="text-slate-400 text-sm mt-1">Analytics will appear after students complete exams</p>
        </div>
      ) : (
        <div className="space-y-6 animate-slide-up">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card flex items-center gap-4">
              <div className="stat-icon bg-gradient-primary">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{data.average_score.toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mt-0.5">Average Score</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="stat-icon bg-gradient-green">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{data.attempt_count}</p>
                <p className="text-xs text-slate-400 mt-0.5">Total Attempts</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="stat-icon bg-gradient-gold">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{chartData.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">Topics Covered</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Performance by Topic</h2>
                  <p className="text-xs text-slate-400">Correct answers out of total per topic</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 6 }} />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Topic table */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="space-y-2">
                  {chartData.sort((a, b) => a.accuracy - b.accuracy).map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-32 truncate">{t.name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${t.accuracy}%`,
                            backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-right">{t.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
