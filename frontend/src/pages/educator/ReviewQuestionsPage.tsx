import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { CheckCircle, Trash2, FileQuestion, Tag, Gauge, Pencil, X, Save } from 'lucide-react';

interface MCQChoice  { key: string; text: string; }
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

const typeColors: Record<string, string> = {
  multiple_choice:   'bg-blue-100 text-blue-700',
  true_or_false:     'bg-purple-100 text-purple-700',
  fill_in_the_blank: 'bg-cyan-100 text-cyan-700',
  essay:             'bg-orange-100 text-orange-700',
  matching:          'bg-pink-100 text-pink-700',
};

const diffColors: Record<string, string> = {
  easy:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
};

const typeLabel: Record<string, string> = {
  multiple_choice:   'MCQ',
  true_or_false:     'T/F',
  fill_in_the_blank: 'Fill',
  essay:             'Essay',
  matching:          'Match',
};

// ── View: choices display ────────────────────────────────────────────────────

function ChoicesView({ q }: { q: Question }) {
  const { question_type, choices, correct_answer } = q;

  if (question_type === 'multiple_choice') {
    const items = choices as MCQChoice[] | undefined;
    if (!items || items.length === 0) {
      return <p className="text-xs text-slate-400 mt-1.5">Answer: <span className="text-slate-600 font-medium">{correct_answer}</span></p>;
    }
    return (
      <div className="mt-2 space-y-1">
        {items.map(c => (
          <div key={c.key} className={`flex items-start gap-2 text-xs rounded px-2 py-1 ${
            correct_answer === c.key
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-slate-50 text-slate-600'
          }`}>
            <span className="font-bold w-4 flex-shrink-0">{c.key}.</span>
            <span className="flex-1">{c.text}</span>
            {correct_answer === c.key && <span className="text-emerald-600 font-semibold flex-shrink-0">✓ Correct</span>}
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
            correct_answer === opt
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-slate-50 text-slate-400'
          }`}>
            {correct_answer === opt && '✓ '}{opt}
          </span>
        ))}
      </div>
    );
  }

  if (question_type === 'matching') {
    const pairs = choices as MatchPair[] | undefined;
    if (!pairs || pairs.length === 0) return <p className="text-xs text-slate-400 mt-1.5">No pairs stored.</p>;
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-slate-400 font-medium">Match the pairs:</p>
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

  if (question_type === 'fill_in_the_blank') {
    return (
      <p className="text-xs text-slate-400 mt-1.5">
        Fill in: <span className="text-slate-600 font-medium">{correct_answer}</span>
      </p>
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

  return <p className="text-xs text-slate-400 mt-1.5">Answer: <span className="text-slate-600 font-medium">{correct_answer}</span></p>;
}

// ── Edit: answer field varies by type ────────────────────────────────────────

function AnswerEditor({
  questionType, draft, setDraft,
}: {
  questionType: string;
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
}) {
  if (questionType === 'multiple_choice') {
    const choices = (draft.choices ?? []) as MCQChoice[];
    return (
      <div className="space-y-1.5">
        <label className="text-xs text-slate-500 font-medium block">Choices — click a letter to mark it correct</label>
        {choices.map((c, i) => (
          <div key={c.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(d => ({ ...d, correct_answer: c.key }))}
              className={`w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 border-2 transition-colors ${
                draft.correct_answer === c.key
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 text-slate-500 hover:border-emerald-400'
              }`}
            >
              {c.key}
            </button>
            <input
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              value={c.text}
              onChange={e => {
                const updated = choices.map((ch, idx) => idx === i ? { ...ch, text: e.target.value } : ch);
                setDraft(d => ({ ...d, choices: updated }));
              }}
            />
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
            <button
              key={opt}
              type="button"
              onClick={() => setDraft(d => ({ ...d, correct_answer: opt }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                draft.correct_answer === opt
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-200 text-slate-500 hover:border-emerald-300 bg-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (questionType === 'matching') {
    const pairs = (draft.choices ?? []) as MatchPair[];
    const addPair = () => setDraft(d => ({ ...d, choices: [...pairs, { left: '', right: '' }] }));
    const removePair = (i: number) => setDraft(d => ({ ...d, choices: pairs.filter((_, idx) => idx !== i) }));
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500 font-medium">Matching Pairs</label>
          <button type="button" onClick={addPair} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">+ Add pair</button>
        </div>
        {pairs.length === 0 && (
          <p className="text-xs text-slate-400 italic">No pairs yet — click "Add pair" to create them.</p>
        )}
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              placeholder="Term / Left"
              value={p.left}
              onChange={e => {
                const updated = pairs.map((pr, idx) => idx === i ? { ...pr, left: e.target.value } : pr);
                setDraft(d => ({ ...d, choices: updated }));
              }}
            />
            <span className="text-slate-400 text-sm flex-shrink-0">→</span>
            <input
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              placeholder="Definition / Right"
              value={p.right}
              onChange={e => {
                const updated = pairs.map((pr, idx) => idx === i ? { ...pr, right: e.target.value } : pr);
                setDraft(d => ({ ...d, choices: updated }));
              }}
            />
            <button type="button" onClick={() => removePair(i)} className="text-slate-300 hover:text-red-400 flex-shrink-0 text-lg leading-none">×</button>
          </div>
        ))}
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Instruction Text (correct_answer)</label>
          <input
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
            placeholder='e.g. "Match each term to its definition"'
            value={draft.correct_answer}
            onChange={e => setDraft(d => ({ ...d, correct_answer: e.target.value }))}
          />
        </div>
      </div>
    );
  }

  if (questionType === 'essay') {
    return (
      <div>
        <label className="text-xs text-slate-500 font-medium mb-1 block">Model Answer</label>
        <textarea
          rows={4}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none resize-none"
          value={draft.correct_answer}
          onChange={e => setDraft(d => ({ ...d, correct_answer: e.target.value }))}
        />
      </div>
    );
  }

  // fill_in_the_blank and fallback
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium mb-1 block">
        {questionType === 'fill_in_the_blank' ? 'Answer (word/phrase for the blank)' : 'Correct Answer'}
      </label>
      <input
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
        value={draft.correct_answer}
        onChange={e => setDraft(d => ({ ...d, correct_answer: e.target.value }))}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewQuestionsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    question_text: '', correct_answer: '', difficulty: '', topic_tag: '', choices: null,
  });

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['questions', subjectId],
    queryFn: () => api.get(`/questions?subject_id=${subjectId}`).then(r => r.data),
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

  const startEdit = (q: Question) => {
    setEditingId(q.id);

    let choices: MCQChoice[] | MatchPair[] | null = (q.choices ?? null) as MCQChoice[] | MatchPair[] | null;

    // MCQ: always seed 4 labelled slots so the educator can fill them in
    if (q.question_type === 'multiple_choice') {
      const existing = (Array.isArray(choices) && choices.length > 0 && 'key' in (choices as any[])[0])
        ? (choices as MCQChoice[])
        : [];
      choices = existing.length === 4
        ? existing
        : [
            { key: 'A', text: existing.find(c => c.key === 'A')?.text ?? '' },
            { key: 'B', text: existing.find(c => c.key === 'B')?.text ?? '' },
            { key: 'C', text: existing.find(c => c.key === 'C')?.text ?? '' },
            { key: 'D', text: existing.find(c => c.key === 'D')?.text ?? '' },
          ];
    }

    setDraft({
      question_text:  q.question_text,
      correct_answer: q.correct_answer,
      difficulty:     q.difficulty,
      topic_tag:      q.topic_tag,
      choices,
    });
  };

  const approved = questions.filter(q => q.is_approved).length;
  const editingQuestion = questions.find(q => q.id === editingId);

  return (
    <Layout role="educator">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Review Questions</h1>
          <p className="page-subtitle">Approve or remove AI-generated questions before publishing</p>
        </div>
        {questions.length > 0 && (
          <div className="card py-2.5 px-4 flex items-center gap-3 text-sm">
            <div className="text-center">
              <p className="font-bold text-slate-900">{questions.length}</p>
              <p className="text-slate-400 text-xs">Total</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className="font-bold text-emerald-600">{approved}</p>
              <p className="text-slate-400 text-xs">Approved</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className="font-bold text-amber-600">{questions.length - approved}</p>
              <p className="text-slate-400 text-xs">Pending</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="card text-center py-16">
          <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No questions yet</p>
          <p className="text-slate-400 text-sm mt-1">Generate questions from the Documents page first</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const isEditing = editingId === q.id;
            return (
              <div
                key={q.id}
                className={`card transition-all duration-200 ${
                  q.is_approved ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-xs text-slate-400 font-medium">#{i + 1}</span>
                      <span className={`badge ${typeColors[q.question_type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {typeLabel[q.question_type] ?? q.question_type}
                      </span>
                      {!isEditing && (
                        <span className={`badge ${diffColors[q.difficulty] ?? 'bg-slate-100 text-slate-600'} capitalize`}>
                          <Gauge className="w-3 h-3" /> {q.difficulty}
                        </span>
                      )}
                      {!isEditing && q.topic_tag && (
                        <span className="badge bg-violet-50 text-violet-600">
                          <Tag className="w-3 h-3" /> {q.topic_tag}
                        </span>
                      )}
                      {q.is_approved && (
                        <span className="badge bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      /* ── Edit mode ── */
                      <div className="space-y-3 mt-1">
                        <div>
                          <label className="text-xs text-slate-500 font-medium mb-1 block">Question</label>
                          <textarea
                            rows={3}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none resize-none"
                            value={draft.question_text}
                            onChange={e => setDraft(d => ({ ...d, question_text: e.target.value }))}
                          />
                        </div>

                        <AnswerEditor
                          questionType={editingQuestion?.question_type ?? ''}
                          draft={draft}
                          setDraft={setDraft}
                        />

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 font-medium mb-1 block">Difficulty</label>
                            <select
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                              value={draft.difficulty}
                              onChange={e => setDraft(d => ({ ...d, difficulty: e.target.value }))}
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 font-medium mb-1 block">Topic Tag</label>
                            <input
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                              value={draft.topic_tag}
                              onChange={e => setDraft(d => ({ ...d, topic_tag: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── View mode ── */
                      <>
                        <p className="text-slate-800 text-sm font-medium leading-relaxed mb-1">{q.question_text}</p>
                        <ChoicesView q={q} />
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => updateMutation.mutate({ id: q.id, data: draft })}
                          disabled={updateMutation.isPending}
                          className="btn-success text-xs py-1.5 px-3"
                        >
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
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        <button onClick={() => startEdit(q)} className="btn-secondary text-xs py-1.5 px-3">
                          <Pencil className="w-3.5 h-3.5" /> Edit
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
    </Layout>
  );
}
