import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTeacherCourses, deleteCourse, createDemoCourse } from '../../services/teacherService';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/Card';
import { Plus, BookOpen, Edit, Eye, Shield, Code2, Trash2, Wand2, AlertCircle, Users } from 'lucide-react';

export default function TeacherCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  async function loadCourses() {
    if (!user) return;
    setLoading(true);
    const { data } = await getTeacherCourses(user.id);
    if (data) setCourses(data);
    setLoading(false);
  }

  const handleCreateCourse = () => {
    navigate('/teacher/courses/new');
  };

  const handleCreateDemo = async () => {
    if (!user) return;
    setSeeding(true);
    const { error } = await createDemoCourse(user.id);
    setSeeding(false);
    
    if (error) {
      showToast('Hata: ' + error.message, 'error');
    } else {
      showToast('Şablon kurslar başarıyla eklendi!');
      loadCourses();
    }
  };

  const handleDelete = async (courseId, courseTitle) => {
    if (window.confirm(`"${courseTitle}" kursunu silmek istediğinize emin misiniz?`)) {
      const { error } = await deleteCourse(courseId);
      if (error) showToast('Hata: ' + error.message, 'error');
      else {
        showToast('Kurs silindi.');
        loadCourses();
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl text-white">Kurslarım</h1>
            <p className="text-slate-400 text-sm mt-1">Öğrenciler için oluşturduğun tüm içerikler</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCreateDemo}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold transition-all disabled:opacity-50"
            >
              {seeding ? <LoadingSpinner size="sm" /> : <Wand2 size={18} />} Örnek Kurs Yükle
            </button>
            <button
              onClick={handleCreateCourse}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-lg shadow-violet-500/30"
            >
              <Plus size={18} /> Yeni Kurs Oluştur
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner fullPage />
        ) : courses.length === 0 ? (
          <EmptyState
            emoji="📚"
            title="Henüz kursun yok"
            desc="Öğrenciler için ilk siber güvenlik kursunu oluşturmaya başla."
            action={{ label: 'Kurs Oluştur', onClick: handleCreateCourse }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => {
              const isAwareness = course.category === 'awareness';
              const Icon = isAwareness ? Shield : Code2;
              const bannerColor = isAwareness 
                ? 'from-cyan-900/40 to-blue-900/20 border-cyan-500/20' 
                : 'from-orange-900/40 to-red-900/20 border-orange-500/20';

              return (
                <Card key={course.id} hover className={`border ${bannerColor} p-0 overflow-hidden flex flex-col`}>
                  <div className={`p-5 flex-1 bg-gradient-to-br ${bannerColor}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center border border-white/10">
                        {course.thumbnail_emoji}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/10 ${isAwareness ? 'text-cyan-400 border-cyan-500/30' : 'text-orange-400 border-orange-500/30'}`}>
                          {isAwareness ? 'Farkındalık' : 'Teknik'}
                        </span>
                        <button 
                          onClick={() => handleDelete(course.id, course.title)} 
                          className="text-slate-400 hover:text-rose-400 transition-colors bg-white/5 hover:bg-rose-500/20 p-1.5 rounded-lg"
                          title="Kursu Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-white mb-1">{course.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <BookOpen size={14} />
                      <span>{course.lessons?.[0]?.count || 0} Ders</span>
                      <span className="mx-1">•</span>
                      <span className={course.is_published ? 'text-emerald-400' : 'text-amber-400'}>
                        {course.is_published ? 'Yayında' : 'Taslak'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/5">
                    <button
                      onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                      className="py-3 text-xs text-slate-300 font-medium hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit size={14} /> Düzenle
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/courses/${course.id}/details`)}
                      className="py-3 text-xs text-cyan-400 font-medium hover:text-cyan-300 hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Users size={14} /> Detaylar
                    </button>
                    <button
                      onClick={() => navigate(`/student/courses/${course.id}`)}
                      className="py-3 text-xs text-violet-400 font-medium hover:text-violet-300 hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} /> Önizle
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>
      {/* Toast Bildirimi */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-slide-up bg-slate-900/95 text-sm font-medium ${
          toast.type === 'error' ? 'border-rose-500/50 text-rose-300' : 'border-emerald-500/50 text-emerald-300'
        }`}>
          <AlertCircle size={18} className={`shrink-0 ${toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span>{toast.message}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
