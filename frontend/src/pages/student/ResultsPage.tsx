import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { Trophy, ArrowLeft, CheckCircle, XCircle, Calendar } from 'lucide-react';

interface AttemptResult {
  id: string; total_score: number; max_score: number;
  percentage: number; submitted_at: string;
}

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const { data: result, isLoading } = useQuery<AttemptResult>({
    queryKey: ['result', attemptId],
    queryFn: () => api.get(`/attempts/${attemptId}`).then(r => r.data),
  });

  const passed = (result?.percentage ?? 0) >= 75;

  return (
    <Layout role="student">
      <div className="max-w-lg mx-auto">
        <Link to="/student/exams" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Exams
        </Link>

        {isLoading ? (
          <div className="card h-64 animate-pulse bg-slate-100" />
        ) : !result ? (
          <div className="card text-center py-12">
            <p className="text-slate-500">Result not found.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* Score circle */}
            <div className={`card text-center py-10 ${passed ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-400'}`}>
              <div className="relative inline-block mb-6">
                <div className={`w-36 h-36 rounded-full flex items-center justify-center border-8 mx-auto
                  ${passed ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                  <div>
                    <p className={`text-4xl font-bold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                      {result.percentage?.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center
                  ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {passed ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                </div>
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4
                ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                <Trophy className="w-4 h-4" />
                {passed ? 'Passed!' : 'Failed'}
              </div>

              <p className="text-2xl font-bold text-slate-800">
                {result.total_score} <span className="text-slate-400 font-normal text-lg">/ {result.max_score}</span>
              </p>
              <p className="text-slate-400 text-sm mt-1">points earned</p>

              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-4">
                <Calendar className="w-3.5 h-3.5" />
                Submitted {new Date(result.submitted_at).toLocaleString()}
              </div>
            </div>

            {/* Progress bar */}
            <div className="card">
              <p className="text-sm font-medium text-slate-700 mb-3">Score breakdown</p>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${passed ? 'bg-gradient-green' : 'bg-gradient-orange'}`}
                  style={{ width: `${Math.min(result.percentage ?? 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                <span>0%</span>
                <span className="text-slate-600 font-medium">{result.percentage?.toFixed(1)}%</span>
                <span>100%</span>
              </div>
              {!passed && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
                  Passing score is 75%. Review the topics you missed and try again.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
