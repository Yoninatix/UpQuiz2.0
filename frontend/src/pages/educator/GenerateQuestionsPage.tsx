import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { Sparkles, Plus, X, Save, AlertCircle, Tag, Gauge, CheckCircle2, Loader2 } from 'lucide-react';

type QType = 'multiple_choice' | 'true_or_false' | 'fill_in_the_blank' | 'essay' | 'matching';
type Difficulty = 'easy' | 'medium' | 'hard';
interface QuestionConfig { type: QType; difficulty: Difficulty; count: number; }

const QTYPES: { value: QType; label: string; color: string }[] = [
  { value: 'multiple_choice',   label: 'Multiple Choice',   color: 'bg-blue-100 text-blue-700' },
  { value: 'true_or_false',     label: 'True or False',     color: 'bg-purple-100 text-purple-700' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'essay',             label: 'Essay',             color: 'bg-orange-100 text-orange-700' },
  { value: 'matching',          label: 'Matching',          color: 'bg-pink-100 text-pink-700' },
];

const diffColors: Record<string, string> = {
  easy:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
};

const typeColor = (t: string) => QTYPES.find(q => q.value === t)?.color ?? 'bg-slate-100 text-slate-600';
const typeLabel = (t: string) => {
  const map: Record<string, string> = { multiple_choice: 'MCQ', true_or_false: 'T/F', fill_in_the_blank: 'Fill', essay: 'Essay', matching: 'Match' };
  return map[t] ?? t;
};

export default function GenerateQuestionsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const qc = useQueryClient();
  const [topicHint, setTopicHint] = useState('');
  const [configs, setConfigs] = useState<QuestionConfig[]>([
    { type: 'multiple_choice', difficulty: 'medium', count: 5 },
  ]);
  const [result, setResult] = useState<any[]>([]);
  const [error, setError] = useState('');

  const generateMutation = useMutation({
    mutationFn: () => api.post('/rag/generate', { subject_id: subjectId, topic_hint: topicHint, configs }, { timeout: 0 }),
    onSuccess: (res) => { setResult(res.data.questions); setError(''); },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Generation failed'),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post('/questions/bulk', {
      subject_id: subjectId,
      questions: result.map((q: any) => ({
        document_id:   q.document_id,
        chunk_id:      q.source_chunk_uuid,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty:    q.difficulty,
        topic_tag:     q.topic_tag,
        correct_answer: q.correct_answer,
        choices:       q.choices,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['questions', subjectId] }); setResult([]); },
  });

  const addConfig = () => setConfigs(c => [...c, { type: 'multiple_choice', difficulty: 'medium', count: 3 }]);
  const removeConfig = (i: number) => setConfigs(c => c.filter((_, idx) => idx !== i));
  const updateConfig = (i: number, key: keyof QuestionConfig, value: any) =>
    setConfigs(c => c.map((cfg, idx) => idx === i ? { ...cfg, [key]: value } : cfg));

  const totalCount = configs.reduce((sum, c) => sum + c.count, 0);

  return (
    <Layout role="educator">
      <div className="page-header">
        <h1 className="page-title">Generate Questions</h1>
        <p className="page-subtitle">Use AI to create questions from your uploaded documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Topic / Focus Area <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                className="input"
                placeholder="Leave blank to draw from the whole document"
                value={topicHint}
                onChange={e => setTopicHint(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                {topicHint.trim()
                  ? 'Questions will focus on this topic.'
                  : 'No topic set — questions will be drawn from across the entire document.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Question Distribution</label>
                <button onClick={addConfig} className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add type
                </button>
              </div>
              <div className="space-y-2">
                {configs.map((cfg, i) => (
                  <div key={i} className="flex gap-2 items-center bg-slate-50 rounded-xl p-2.5">
                    <select
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                      value={cfg.type}
                      onChange={e => updateConfig(i, 'type', e.target.value)}
                    >
                      {QTYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <select
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                      value={cfg.difficulty}
                      onChange={e => updateConfig(i, 'difficulty', e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <input
                      type="number" min={1} max={20}
                      className="w-14 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                      value={cfg.count}
                      onChange={e => updateConfig(i, 'count', Number(e.target.value))}
                    />
                    <button onClick={() => removeConfig(i)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">Total: <span className="font-semibold text-slate-600">{totalCount} questions</span></p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {generateMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><Sparkles className="w-4 h-4" /> Generate Questions</>
              }
            </button>
          </div>

          {generateMutation.isPending && (
            <div className="card bg-gradient-to-br from-primary-50 to-violet-50 border-primary-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">AI is generating…</p>
                  <p className="text-xs text-slate-500">This may take up to a minute</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2">
          {result.length > 0 ? (
            <div className="space-y-3">
              <div className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{result.length} Questions Generated</p>
                  <p className="text-xs text-slate-400 mt-0.5">Review below, then save for approval</p>
                </div>
                <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-success text-sm">
                  {saveMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save for Review</>
                  }
                </button>
              </div>

              {result.map((q, i) => (
                <div key={i} className="card animate-slide-up">
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <span className="text-xs text-slate-400 font-medium">#{i + 1}</span>
                    <span className={`badge ${typeColor(q.question_type)}`}>{typeLabel(q.question_type)}</span>
                    <span className={`badge ${diffColors[q.difficulty] ?? 'bg-slate-100 text-slate-600'} capitalize`}>
                      <Gauge className="w-3 h-3" /> {q.difficulty}
                    </span>
                    {q.topic_tag && (
                      <span className="badge bg-violet-50 text-violet-600">
                        <Tag className="w-3 h-3" /> {q.topic_tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed mb-1.5">{q.question_text}</p>
                  <p className="text-xs text-slate-400">
                    Answer: <span className="text-slate-600 font-semibold">{q.correct_answer}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-16 h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 opacity-20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-500 font-medium">No questions yet</p>
              <p className="text-slate-400 text-sm mt-1">Configure and generate questions on the left</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
