import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// ── Auth pages ───────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// ── Admin pages ──────────────────────────────────────────────
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';

// ── Educator pages ───────────────────────────────────────────
import EducatorDashboard from './pages/educator/EducatorDashboard';
import SubjectsPage from './pages/educator/SubjectsPage';
import DocumentsPage from './pages/educator/DocumentsPage';
import GenerateQuestionsPage from './pages/educator/GenerateQuestionsPage';
import ReviewQuestionsPage from './pages/educator/ReviewQuestionsPage';
import CreateExamPage from './pages/educator/CreateExamPage';
import ExamListPage from './pages/educator/ExamListPage';
import AnalyticsPage from './pages/educator/AnalyticsPage';

// ── Student pages ────────────────────────────────────────────
import StudentDashboard from './pages/student/StudentDashboard';
import MyExamsPage from './pages/student/MyExamsPage';
import TakeExamPage from './pages/student/TakeExamPage';
import ResultsPage from './pages/student/ResultsPage';

// ── Layout ───────────────────────────────────────────────────
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
        </Route>

        {/* Educator */}
        <Route path="/educator" element={<ProtectedRoute role="educator" />}>
          <Route index element={<EducatorDashboard />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/:subjectId/documents" element={<DocumentsPage />} />
          <Route path="subjects/:subjectId/generate" element={<GenerateQuestionsPage />} />
          <Route path="subjects/:subjectId/review" element={<ReviewQuestionsPage />} />
          <Route path="subjects/:subjectId/exams/create" element={<CreateExamPage />} />
          <Route path="subjects/:subjectId/exams" element={<ExamListPage />} />
          <Route path="subjects/:subjectId/analytics" element={<AnalyticsPage />} />
        </Route>

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute role="student" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="exams" element={<MyExamsPage />} />
          <Route path="exams/:examId/take" element={<TakeExamPage />} />
          <Route path="results/:attemptId" element={<ResultsPage />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const role = useAuthStore(s => s.user?.role);
  if (!role) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'educator') return <Navigate to="/educator" replace />;
  return <Navigate to="/student" replace />;
}
