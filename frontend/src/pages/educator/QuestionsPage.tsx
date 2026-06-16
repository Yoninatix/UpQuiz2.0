import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import {
  Sparkles, Plus, X, Save, AlertCircle, Tag, Gauge,
  CheckCircle, CheckCircle2, Trash2, FileQuestion,
  Pencil, Loader2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type QType = 'multiple_choice' | 'true_or_false' | 'fill_in_the_blank' | 'essay' | 'matching';
type Difficulty = 'easy' | 'medium' | 'hard';

interface QuestionConfig { type: QType; difficulty: Difficulty; count: number; }

interface MCQChoice { key: string; text: string; }
interface MatchPair  { left: string; right: string; }

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  topic_tag: string;
  correct_answer: string;
  is_approved: boolean;
  choices?: MCQChoice[] | MatchPair[] | null;
}

interface EditDraft {
  question_text:  string;
  correct_answer: string;
  difficulty:     string;
  topic_tag:      string;
  choices:        MCQChoice[] | MatchPair[] | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const typeColors: Record<string, string> = Object.fromEntries(QTYPES.map(q => [q.value, q.color]));

const typeLabel: Record<string, string> = {
  multiple_choice:   'MCQ',
  true_or_false:     'T/F',
  fill_in_the_blank: 'Fill',
  essay:             'Essay',
  matching:          'Match',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChoicesView({ q }: { q: Question }) {
  const { question_type, choices, correct_answer } = q;

  if (question_type === 'multiple_choice') {
    // Normalize to [{key, text}] regardless of storage format
    let items: MCQChoice[] = [];
    if (Array.isArray(choices) && choices.length > 0) {
      items = (choices as any[]).map((c, i) => ({
        key: String(c.key ?? c.Key ?? String.fromCharCode(65 + i)).toUpperCase(),
        text: String(c.text ?? c.Text ?? c.value ?? c.Value ?? ''),
      }));
    } else if (choices && typeof choices === 'object' && !Array.isArray(choices)) {
      items = Object.entries(choices as Record<string, unknown>)
        .map(([k, v]) => ({ key: k.toUpperCase(), text: String(v ?? '') }))
        .sort((a, b) => a.key.localeCompare(b.key));
    }
    if (!items.length) return <p className="text-xs text-slate-400 mt-1.5">Answer: <span className="font-medium text-slate-600">{correct_answer}</span></p>;
    return (
      <div className="mt-2 space-y-1">
        {items.map(c => (
          <div key={c.key} className={`flex items-start gap-2 text-xs rounded px-2 py-1 ${
            correct_answer === c.key ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-slate-50 text-slate-600'
          }`}>
            <span className="font-bold w-4 flex-shrink-0">{c.key}.</span>
            <span className="flex-1">{c.text}</span>
            {correct_answer === c.key && <span className="text-emerald-600 font-semibold flex-shrink-0">✓</span>}
          </div>
        ))}
      </div>
    );
  }

  if (question_type === 'true_or_false') {
    return (
      <div className="mt-2 flex gap-2">
        {['True', 'False'].map(opt => (
          <span key={opt} className={`text-xs rounded px-3 py-1 font-medium ${
            correct_answer === opt ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-slate-50 text-slate-400'
          }`}>
            {correct_answer === opt && '✓ '}{opt}
          </span>
        ))}
      </div>
    );
  }

  if (question_type === 'matching') {
    const pairs = choices as MatchPair[] | undefined;
    if (!pairs?.length) return <p className="text-xs text-slate-400 mt-1.5">No pairs stored.</p>;
    return (
      <div className="mt-2 space-y-1">
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="bg-blue-50 border border-blue-100 text-blue-700 rounded px-2 py-0.5 min-w-[90px]">{p.left}</span>
            <span className="text-slate-400">→</span>
            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded px-2 py-0.5">{p.right}</span>
          </div>
        ))}
      </div>
    );
  }

  if (question_type === 'essay') {
    return (
      <div className="mt-1.5">
        <p className="text-xs text-slate-400 font-medium mb-0.5">Model Answer:</p>
        <p className="text-xs text-slate-600 leading-relaxed">{correct_answer}</p>
      </div>
    );
  }

  return <p className="text-xs text-slate-400 mt-1.5">Answer: <span className="font-medium text-slate-600">{correct_answer}</span></p>;
}

function AnswerEditor({ questionType, draft, setDraft }: {
  questionType: string;
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
}) {
  if (questionType === 'multiple_choice') {
    const choices = (draft.choices ?? []) as MCQChoice[];
    return (
      <div className="space-y-1.5">
        <label className="text-xs text-slate-500 font-medium block">Choices — click a letter to mark correct</label>
        {choices.map((c, i) => (
          <div key={c.key} className="flex items-center gap-2">
            <button type="button" onClick={() => setDraft(d => ({ ...d, correct_answer: c.key }))}
              className={`w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 border-2 transition-colors ${
                draft.correct_answer === c.key
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 text-slate-500 hover:border-emerald-400'
              }`}>
              {c.key}
            </button>
            <input className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              value={c.text}
              onChange={e => {
                const updated = choices.map((ch, idx) => idx === i ? { ...ch, text: e.target.value } : ch);
                setDraft(d => ({ ...d, choices: updated }));
              }} />
          </div>
        ))}
      </div>
    );
  }

  if (questionType === 'true_or_false') {
    return (
      <div>
        <label className="text-xs text-slate-500 font-medium mb-1 block">Correct Answer</label>
        <div className="flex gap-2">
          {['True', 'False'].map(opt => (
            <button key={opt} type="button" onClick={() => setDraft(d => ({ ...d, correct_answer: opt }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                draft.correct_answer === opt
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-200 text-slate-500 hover:border-emerald-300 bg-white'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (questionType === 'matching') {
    const pairs = (draft.choices ?? []) as MatchPair[];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500 font-medium">Matching Pairs</label>
          <button type="button" onClick={() => setDraft(d => ({ ...d, choices: [...pairs, { left: '', right: '' }] }))}
            className="text-xs text-primary-600 hover:text-primary-700 font-semibold">+ Add pair</button>
        </div>
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="Term" value={p.left}
              onChange={e => { const u = pairs.map((pr, j) => j === i ? { ...pr, left: e.target.value } : pr); setDraft(d => ({ ...d, choices: u })); }} />
            <span className="text-slate-400 text-sm">→</span>
            <input className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="Definition" value={p.right}
              onChange={e => { const u = pairs.map((pr, j) => j === i ? { ...pr, right: e.target.value } : pr); setDraft(d => ({ ...d, choices: u })); }} />
            <button type="button" onClick={() => setDraft(d => ({ ...d, choices: pairs.filter((_, j) => j !== i) }))}
              className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
          </div>
        ))}
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Instruction text</label>
          <input className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-300"
            placeholder='e.g. "Match each term to its definition"'
            value={draft.correct_answer} onChange={e => setDraft(d => ({ ...d, correct_answer: e.target.value }))} />
        </div>
      </div>
    );
  }

  if (questionType === 'essay') {
    return (
      <div>
        <label className="text-xs text-slate-500 font-medium mb-1 block">Model Answer</label>
        <textarea rows={4} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          value={draft.correct_answer} onChange={e => setDraft(d => ({ ...d, correct_answer: e.target.value }))} />
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs text-slate-500 font-medium mb-1 block">
        {questionType === 'fill_in_the_blank' ? 'Answer (word/phrase for the blank)' : 'Correct Answer'}
      </label>
      <input className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-300"
        value={draft.correct_answer} onChange={e => setDraft(d => ({ ...d, correct_answer: e.target.value }))} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'generate' | 'saved';

export default function QuestionsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('generate');

  // ── Generate state ──
  const [topicHint, setTopicHint] = useState('');
  const [configs, setConfigs] = useState<QuestionConfig[]>([
    { type: 'multiple_choice', difficulty: 'medium', count: 5 },
  ]);
  const [generated, setGenerated] = useState<any[]>([]);
  const [genError, setGenError] = useState('');

  // ── Review state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fillingId, setFillingId] = useState<string | null>(null); // loading choices via AI
  const [draft, setDraft] = useState<EditDraft>({
    question_text: '', correct_answer: '', difficulty: '', topic_tag: '', choices: null,
  });

  // ── Queries / mutations ──
  const { data: savedQuestions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['questions', subjectId],
    queryFn: () => api.get(`/questions?subject_id=${subjectId}`).then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/rag/generate', { subject_id: subjectId, topic_hint: topicHint, configs }, { timeout: 0 }),
    onSuccess: (res) => { setGenerated(res.data.questions); setGenError(''); },
    onError: (err: any) => setGenError(err.response?.data?.error ?? 'Generation failed'),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post('/questions/bulk', {
      subject_id: subjectId,
      questions: generated.map((q: any) => ({
        document_id:    q.document_id,
        chunk_id:       q.source_chunk_uuid,
        question_text:  q.question_text,
        question_type:  q.question_type,
        difficulty:     q.difficulty,
        topic_tag:      q.topic_tag,
        correct_answer: q.correct_answer,
        choices:        q.choices,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', subjectId] });
      setGenerated([]);
      setTab('saved');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/questions/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', subjectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', subjectId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditDraft }) =>
      api.put(`/questions/${id}`, {
        question_text:  data.question_text,
        correct_answer: data.correct_answer,
        difficulty:     data.difficulty,
        topic_tag:      data.topic_tag,
        choices:        data.choices,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', subjectId] });
      setEditingId(null);
    },
  });

  // ── Config helpers ──
  const addConfig = () => setConfigs(c => [...c, { type: 'multiple_choice', difficulty: 'medium', count: 3 }]);
  const removeConfig = (i: number) => setConfigs(c => c.filter((_, idx) => idx !== i));
  const updateConfig = (i: number, key: keyof QuestionConfig, value: any) =>
    setConfigs(c => c.map((cfg, idx) => idx === i ? { ...cfg, [key]: value } : cfg));
  const totalCount = configs.reduce((sum, c) => sum + c.count, 0);

  const buildMCQChoices = (raw: any): MCQChoice[] => {
    const byKey: Record<string, string> = {};
    if (Array.isArray(raw)) {
      (raw as any[]).forEach((c, i) => {
        if (!c || typeof c !== 'object') return;
        const k = String(c.key ?? c.Key ?? String.fromCharCode(65 + i)).toUpperCase();
        const t = String(c.text ?? c.Text ?? c.value ?? c.Value ?? '');
        if (k) byKey[k] = t;
      });
    } else if (raw && typeof raw === 'object') {
      Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
        byKey[k.toUpperCase()] = String(v ?? '');
      });
    }
    return ['A', 'B', 'C', 'D'].map(k => ({ key: k, text: byKey[k] ?? '' }));
  };

  const hasValidChoices = (q: Question): boolean => {
    const c = q.choices;
    if (!c) return false;
    if (Array.isArray(c)) return (c as any[]).some(item => item && (item.text ?? item.Text ?? item.value ?? '').length > 0);
    if (typeof c === 'object') return Object.values(c as object).some(v => String(v ?? '').length > 0);
    return false;
  };

  const startEdit = async (q: Question) => {
    let choices: MCQChoice[] | MatchPair[] | null = (q.choices ?? null) as any;

    if (q.question_type === 'multiple_choice') {
      if (!hasValidChoices(q)) {
        // No choices stored — ask AI to generate them
        setFillingId(q.id);
        try {
          const res = await api.post(`/questions/${q.id}/fill-choices`);
          choices = buildMCQChoices(res.data.choices);
          // Optimistically update the cached question so view mode shows choices too
          qc.setQueryData<Question[]>(['questions', subjectId], old =>
            old?.map(item => item.id === q.id ? { ...item, choices: res.data.choices } : item) ?? old
          );
        } catch {
          choices = buildMCQChoices(null); // fall back to 4 empty slots
        } finally {
          setFillingId(null);
        }
      } else {
        choices = buildMCQChoices(choices);
      }
    }

    setEditingId(q.id);
    setDraft({ question_text: q.question_text, correct_answer: q.correct_answer, difficulty: q.difficulty, topic_tag: q.topic_tag, choices });
  };

  const approved = savedQuestions.filter(q => q.is_approved).length;
  const editingQuestion = savedQuestions.find(q => q.id === editingId);

  return (
    <Layout role="educator">
      {/* ── Page header ── */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Questions</h1>
          <p className="page-subtitle">Generate AI questions and manage your question bank</p>
        </div>
        {savedQuestions.length > 0 && (
          <div className="card py-2.5 px-4 flex items-center gap-3 text-sm">
            <div className="text-center">
              <p className="font-bold text-slate-900">{savedQuestions.length}</p>
              <p className="text-slate-400 text-xs">Total</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className="font-bold text-emerald-600">{approved}</p>
              <p className="text-slate-400 text-xs">Approved</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className="font-bold text-amber-600">{savedQuestions.length - approved}</p>
              <p className="text-slate-400 text-xs">Pending</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {([
          { key: 'generate', label: 'Generate Questions', icon: Sparkles },
          { key: 'saved',    label: `Saved Questions${savedQuestions.length ? ` (${savedQuestions.length})` : ''}`, icon: FileQuestion },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-150 ${
              tab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: GENERATE
      ══════════════════════════════════════════════════════ */}
      {tab === 'generate' && (
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
                  {topicHint.trim() ? 'Questions will focus on this topic.' : 'No topic set — drawn from the entire document.'}
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
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-300"
                        value={cfg.type} onChange={e => updateConfig(i, 'type', e.target.value)}
                      >
                        {QTYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-300"
                        value={cfg.difficulty} onChange={e => updateConfig(i, 'difficulty', e.target.value)}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <input
                        type="number" min={1} max={20}
                        className="w-14 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center outline-none focus:ring-2 focus:ring-primary-300"
                        value={cfg.count} onChange={e => updateConfig(i, 'count', Number(e.target.value))}
                      />
                      <button onClick={() => removeConfig(i)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">Total: <span className="font-semibold text-slate-600">{totalCount} questions</span></p>
              </div>

              {genError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {genError}
                </div>
              )}

              <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary w-full justify-center">
                {generateMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-4 h-4" /> Generate Questions</>
                }
              </button>
            </div>

            {generateMutation.isPending && (
              <div className="card border-primary-100 bg-primary-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
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
            {generated.length > 0 ? (
              <div className="space-y-3">
                <div className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{generated.length} Questions Generated</p>
                    <p className="text-xs text-slate-400 mt-0.5">Review below, then save to your question bank</p>
                  </div>
                  <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-success text-sm">
                    {saveMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><Save className="w-4 h-4" /> Save Questions</>
                    }
                  </button>
                </div>

                {generated.map((q, i) => (
                  <div key={i} className="card animate-slide-up">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <span className="text-xs text-slate-400 font-medium">#{i + 1}</span>
                      <span className={`badge ${typeColors[q.question_type] ?? 'bg-slate-100 text-slate-600'}`}>{typeLabel[q.question_type] ?? q.question_type}</span>
                      <span className={`badge ${diffColors[q.difficulty] ?? 'bg-slate-100 text-slate-600'} capitalize`}>
                        <Gauge className="w-3 h-3" /> {q.difficulty}
                      </span>
                      {q.topic_tag && <span className="badge bg-violet-50 text-violet-600"><Tag className="w-3 h-3" /> {q.topic_tag}</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed mb-1.5">{q.question_text}</p>
                    <p className="text-xs text-slate-400">Answer: <span className="text-slate-600 font-semibold">{q.correct_answer}</span></p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-16 h-full flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-600 font-semibold">No questions generated yet</p>
                <p className="text-slate-400 text-sm mt-1">Configure your settings on the left and click Generate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: SAVED QUESTIONS
      ══════════════════════════════════════════════════════ */}
      {tab === 'saved' && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}
            </div>
          ) : savedQuestions.length === 0 ? (
            <div className="card text-center py-16">
              <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No saved questions yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Go to the{' '}
                <button onClick={() => setTab('generate')} className="text-primary-600 font-semibold hover:underline">
                  Generate tab
                </button>
                {' '}to create questions from your documents
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedQuestions.map((q, i) => {
                const isEditing = editingId === q.id;
                return (
                  <div key={q.id} className={`card transition-all duration-200 ${q.is_approved ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-slate-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="text-xs text-slate-400 font-medium">#{i + 1}</span>
                          <span className={`badge ${typeColors[q.question_type] ?? 'bg-slate-100 text-slate-600'}`}>{typeLabel[q.question_type] ?? q.question_type}</span>
                          {!isEditing && <span className={`badge ${diffColors[q.difficulty] ?? 'bg-slate-100 text-slate-600'} capitalize`}><Gauge className="w-3 h-3" /> {q.difficulty}</span>}
                          {!isEditing && q.topic_tag && <span className="badge bg-violet-50 text-violet-600"><Tag className="w-3 h-3" /> {q.topic_tag}</span>}
                          {q.is_approved && <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3" /> Approved</span>}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 mt-1">
                            <div>
                              <label className="text-xs text-slate-500 font-medium mb-1 block">Question</label>
                              <textarea rows={3}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                                value={draft.question_text}
                                onChange={e => setDraft(d => ({ ...d, question_text: e.target.value }))} />
                            </div>
                            <AnswerEditor questionType={editingQuestion?.question_type ?? ''} draft={draft} setDraft={setDraft} />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-slate-500 font-medium mb-1 block">Difficulty</label>
                                <select className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-300"
                                  value={draft.difficulty} onChange={e => setDraft(d => ({ ...d, difficulty: e.target.value }))}>
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-slate-500 font-medium mb-1 block">Topic Tag</label>
                                <input className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-300"
                                  value={draft.topic_tag} onChange={e => setDraft(d => ({ ...d, topic_tag: e.target.value }))} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-800 text-sm font-medium leading-relaxed mb-1">{q.question_text}</p>
                            <ChoicesView q={q} />
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={() => updateMutation.mutate({ id: q.id, data: draft })} disabled={updateMutation.isPending} className="btn-success text-xs py-1.5 px-3">
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5 px-3">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {!q.is_approved && (
                              <button onClick={() => approveMutation.mutate(q.id)} className="btn-success text-xs py-1.5 px-3">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                            )}
                            <button onClick={() => startEdit(q)} disabled={fillingId === q.id} className="btn-secondary text-xs py-1.5 px-3">
                              {fillingId === q.id
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Filling…</>
                                : <><Pencil className="w-3.5 h-3.5" /> Edit</>
                              }
                            </button>
                            <button onClick={() => deleteMutation.mutate(q.id)} className="btn-danger text-xs py-1.5 px-3">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
