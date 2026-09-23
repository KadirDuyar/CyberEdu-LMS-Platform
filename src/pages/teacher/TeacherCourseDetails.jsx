import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/Card';
import { Users, MessageSquare, ArrowLeft, Shield, Code2, Clock } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

export default function TeacherCourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourseDetails() {
      if (!courseId) return;
      setLoading(true);
      try {
        // 1. Fetch Course details
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        setCourse(courseData);

        // 2. Fetch Enrollments with User info
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*, profiles:user_id(id, full_name, avatar_emoji)')
          .eq('course_id', courseId);
        
        setEnrollments(enrollmentData || []);

        // 3. Fetch Feedbacks with User info
        const { data: feedbackData } = await supabase
          .from('course_feedbacks')
          .select('*, profiles:user_id(id, full_name, avatar_emoji)')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        setFeedbacks(feedbackData || []);
      } catch (error) {
        console.error('Kurs detayları yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCourseDetails();
  }, [courseId]);

  if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;
  if (!course) return <DashboardLayout><div className="p-8 text-center text-white">Kurs bulunamadı.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/courses')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="text-4xl bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
              {course.thumbnail_emoji}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{course.title}</h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                {course.category === 'awareness' ? <Shield size={14} className="text-cyan-400"/> : <Code2 size={14} className="text-orange-400"/>}
                {course.category === 'awareness' ? 'Farkındalık' : 'Teknik'} • 
                <span className={course.is_published ? 'text-emerald-400' : 'text-amber-400'}>
                  {course.is_published ? 'Yayında' : 'Taslak'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors"
          >
            Düzenle
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kayıtlı Öğrenciler */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users size={20} className="text-violet-400" />
              Kayıtlı Öğrenciler ({enrollments.length})
            </h2>
            <Card className="p-0 border-white/10 overflow-hidden bg-slate-900/50">
              {enrollments.length === 0 ? (
                <EmptyState emoji="👥" title="Henüz öğrenci yok" desc="Bu kursa henüz kayıt olan öğrenci bulunmuyor." />
              ) : (
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {enrollments.map((enr) => (
                    <div key={enr.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{enr.profiles?.avatar_emoji || '🚀'}</span>
                        <div>
                          <p className="font-bold text-slate-200">{enr.profiles?.full_name || 'İsimsiz Öğrenci'}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            Kayıt: {new Date(enr.enrolled_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          enr.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          enr.status === 'active' ? 'bg-violet-500/20 text-violet-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {enr.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Yorumlar ve Değerlendirmeler */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-cyan-400" />
              Yorumlar ({feedbacks.length})
            </h2>
            <Card className="p-0 border-white/10 overflow-hidden bg-slate-900/50">
              {feedbacks.length === 0 ? (
                <EmptyState emoji="💬" title="Yorum yok" desc="Bu kurs için henüz değerlendirme yapılmamış." />
              ) : (
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {feedbacks.map((fb) => (
                    <div key={fb.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{fb.profiles?.avatar_emoji || '🚀'}</span>
                          <div>
                            <p className="font-bold text-sm text-slate-200">{fb.profiles?.full_name || 'İsimsiz Öğrenci'}</p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(fb.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        {fb.rating && (
                          <div className="flex text-amber-400 text-sm">
                            {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                        {fb.comment || 'Puan verildi, ancak yorum bırakılmadı.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
