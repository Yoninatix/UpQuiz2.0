import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import Layout from '../../components/Layout';
import { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface Doc {
  id: string; original_name: string; status: string;
  file_size_bytes: number; created_at: string; page_count: number | null;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending:    { icon: Clock,        color: 'text-amber-500  bg-amber-50',  label: 'Pending' },
  processing: { icon: Loader2,      color: 'text-blue-500   bg-blue-50',   label: 'Processing' },
  ready:      { icon: CheckCircle,  color: 'text-emerald-500 bg-emerald-50', label: 'Ready' },
  failed:     { icon: XCircle,      color: 'text-red-500    bg-red-50',    label: 'Failed' },
};

export default function DocumentsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ['documents', subjectId],
    queryFn: () => api.get(`/documents?subject_id=${subjectId}`).then(r => r.data),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', subjectId] }),
  });

  const ALLOWED_EXTS = ['.pdf', '.docx', '.txt', '.md'];
  const isAllowed = (name: string) => ALLOWED_EXTS.some(ext => name.toLowerCase().endsWith(ext));

  const doUpload = async (file: File) => {
    if (!isAllowed(file.name)) { setUploadError('Unsupported file type. Allowed: PDF, DOCX, TXT, MD'); return; }
    setUploading(true); setUploadError('');
    const form = new FormData();
    form.append('file', file);
    form.append('subject_id', subjectId!);
    try {
      await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries({ queryKey: ['documents', subjectId] });
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  return (
    <Layout role="educator">
      <div className="page-header">
        <h1 className="page-title">Learning Materials</h1>
        <p className="page-subtitle">Upload PDF files to build your question bank</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`card mb-6 cursor-pointer transition-all duration-200 border-2 border-dashed text-center py-10 select-none
          ${dragOver ? 'border-primary-400 bg-primary-50 scale-[1.01]' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-primary-100' : 'bg-slate-100'}`}>
            <Upload className={`w-7 h-7 ${dragOver ? 'text-primary-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="font-semibold text-slate-700">{uploading ? 'Uploading…' : 'Drop your PDF here'}</p>
            <p className="text-slate-400 text-sm mt-0.5">or <span className="text-primary-600 font-medium">browse files</span> — PDF, DOCX, TXT, MD</p>
          </div>
          {uploading && <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); }} />
      </div>

      {uploadError && (
        <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {uploadError}
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}</div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(d => {
            const cfg = statusConfig[d.status] ?? statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={d.id} className="card flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{d.original_name}</p>
                    <p className="text-xs text-slate-400">
                      {(d.file_size_bytes / 1024).toFixed(1)} KB
                      {d.page_count ? ` · ${d.page_count} pages` : ''}
                      {' · '}{new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge ${cfg.color}`}>
                    <StatusIcon className={`w-3 h-3 ${d.status === 'processing' ? 'animate-spin' : ''}`} />
                    {cfg.label}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(d.id)}
                    disabled={deleteMutation.isPending}
                    className="btn-danger text-xs py-1.5 px-2"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
