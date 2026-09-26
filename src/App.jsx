import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ─── Public Pages ─────────────────────────────────────────────────────────────
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ─── Student Pages ────────────────────────────────────────────────────────────
import StudentDashboard from './pages/StudentDashboard';
import Navigator        from './pages/student/Navigator';
import LearningPath     from './pages/student/LearningPath';
import CourseList       from './pages/student/CourseList';
import CoursePage       from './pages/student/CoursePage';
import LessonPage       from './pages/student/LessonPage';
import AiMentor         from './pages/student/AiMentor';
import Achievements     from './pages/student/Achievements';
import LeaderboardPage  from './pages/student/LeaderboardPage';
import StudentCohorts   from './pages/student/StudentCohorts';

// ─── Teacher Pages ────────────────────────────────────────────────────────────
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherCourses   from './pages/teacher/TeacherCourses';
import CourseEditor     from './pages/teacher/CourseEditor';
import TeacherCourseDetails from './pages/teacher/TeacherCourseDetails';
import LessonBuilder    from './pages/teacher/LessonBuilder';
import TeacherStats     from './pages/teacher/TeacherStats';
import TeacherCohorts   from './pages/teacher/TeacherCohorts';
import CohortDetails   from './pages/teacher/CohortDetails';

// ─── Admin Pages ──────────────────────────────────────────────────────────────
import AdminDashboard from './pages/AdminDashboard';

// ─── Shared Pages ─────────────────────────────────────────────────────────────
import ProfilePage from './pages/ProfilePage';

function ComingSoon({ title, emoji = '🚧' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="text-6xl animate-float">{emoji}</div>
      <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">{title}</h2>
      <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs">
        Bu sayfa geliştirme aşamasında. Yakında hazır olacak!
      </p>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-300 dark:border-violet-500/30">
        <span className="w-2 h-2 bg-violet-600 dark:bg-violet-400 rounded-full animate-pulse" />
        <span className="text-violet-700 dark:text-violet-300 text-xs font-medium">Geliştirme devam ediyor</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public ─────────────────────────────────────────────── */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Student ────────────────────────────────────────────── */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/navigator"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Navigator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/learning-path"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <LearningPath />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/cohorts"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCohorts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <CourseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                <CoursePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/lessons/:lessonId"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                <LessonPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/achievements"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Achievements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/ai-mentor"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AiMentor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/leaderboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/leaderboard/:studentId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile/:studentId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />

          {/* ── Teacher ────────────────────────────────────────────── */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/new"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/edit"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/details"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherCourseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/lessons/new"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <LessonBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/lessons/:lessonId/edit"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <LessonBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/stats"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/cohorts"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherCohorts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/cohorts/:cohortId"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CohortDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── Admin ──────────────────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ComingSoon title="Kurs Yönetimi" emoji="📚" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ComingSoon title="Sistem Ayarları" emoji="⚙️" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── Shared ─────────────────────────────────────────────── */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all ──────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}