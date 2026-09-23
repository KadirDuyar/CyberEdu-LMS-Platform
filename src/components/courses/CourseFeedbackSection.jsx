import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Trash2, EyeOff, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCourseFeedbacks, getUserCourseFeedback, submitCourseFeedback, deleteCourseFeedback } from '../../services/feedbackService';
import Card from '../Card';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function CourseFeedbackSection({ courseId, currentUser }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form durumları
  const [selectedRating, setSelectedRating] = useState('like'); // 'like' | 'dislike'
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [existingFeedbackId, setExistingFeedbackId] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    if (!courseId) return;
    loadFeedbacks();
  }, [courseId, currentUser]);

  async function loadFeedbacks() {
    setLoading(true);
    const { data } = await getCourseFeedbacks(courseId);
    if (data) setFeedbacks(data);

    if (currentUser) {
      const { data: userFb } = await getUserCourseFeedback(courseId, currentUser.id);
      if (userFb) {
        setSelectedRating(userFb.rating);
        setCommentText(userFb.comment || '');
        setIsAnonymous(Boolean(userFb.is_anonymous));
        setExistingFeedbackId(userFb.id);
      }
    }
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setFeedbackError('Geri bildirim bırakmak için giriş yapmalısınız.');
      return;
    }

    setSubmitting(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    const { data, error } = await submitCourseFeedback({
      courseId,
      userId: currentUser.id,
      rating: selectedRating,
      comment: commentText,
      isAnonymous
    });

    setSubmitting(false);

    if (error) {
      setFeedbackError('Geri bildirim kaydedilemedi: ' + error.message);
    } else {
      setFeedbackSuccess(existingFeedbackId ? 'Geri bildiriminiz güncellendi! Teşekkürler.' : 'Geri bildiriminiz başarıyla iletildi! ✨');
      setExistingFeedbackId(data?.id);
      loadFeedbacks();
      setTimeout(() => setFeedbackSuccess(''), 4000);
    }
  };

  const handleDelete = async () => {
    if (!existingFeedbackId) return;
    if (!window.confirm('Geri bildiriminizi silmek istediğinize emin misiniz?')) return;

    setSubmitting(true);
    const { error } = await deleteCourseFeedback(existingFeedbackId);
    setSubmitting(false);

    if (error) {
      setFeedbackError('Geri bildirim silinemedi.');
    } else {
      setExistingFeedbackId(null);
      setCommentText('');
      setSelectedRating('like');
      setIsAnonymous(false);
      setFeedbackSuccess('Geri bildiriminiz silindi.');
      loadFeedbacks();
      setTimeout(() => setFeedbackSuccess(''), 3000);
    }
  };

  // İstatistikler
  const likesCount = feedbacks.filter((f) => f.rating === 'like').length;
  const dislikesCount = feedbacks.filter((f) => f.rating === 'dislike').length;
  const totalCount = feedbacks.length;
  const satisfactionRate = totalCount > 0 ? Math.round((likesCount / totalCount) * 100) : 100;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-violet-400" /> Kurs Değerlendirmeleri & Geri Bildirim
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Bu kurs hakkındaki görüşlerinizi paylaşarak eğitmenimize ve diğer öğrencilere katkı sağlayın.
          </p>
        </div>

        {/* Özet Puan */}
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
            <ThumbsUp size={16} /> <span>{likesCount}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 text-rose-400 text-sm font-bold">
            <ThumbsDown size={16} /> <span>{dislikesCount}</span>
          </div>
          {totalCount > 0 && (
            <>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs font-semibold text-slate-300">%{satisfactionRate} Memnuniyet</span>
            </>
          )}
        </div>
      </div>

      {/* Geri Bildirim Formu (Sadece Öğrenciye / Giriş Yapmış Kullanıcıya) */}
      {currentUser && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="text-xs font-bold text-slate-300">
              {existingFeedbackId ? 'Geri Bildiriminizi Güncelleyin:' : 'Bu kurs nasıldı? Değerlendirin:'}
            </label>

            {/* Like / Dislike Seçimi */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRating('like')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedRating === 'like'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/20 scale-105'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <ThumbsUp size={15} /> Faydalı Buldum
              </button>

              <button
                type="button"
                onClick={() => setSelectedRating('dislike')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedRating === 'dislike'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-500/20 scale-105'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <ThumbsDown size={15} /> Geliştirilmeli
              </button>
            </div>
          </div>

          {/* Yorum Alanı */}
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Kursun anlatımı, soruları veya içeriği hakkında düşünceleriniz (isteğe bağlı)..."
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 resize-none transition-colors"
          />

          {/* Anonim Seçeneği ve Gönder Butonu */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-white/20 bg-slate-800"
              />
              <EyeOff size={14} className={isAnonymous ? 'text-violet-400' : 'text-slate-500'} />
              <span>Anonim Yorum Yap (İsmim gizlensin)</span>
            </label>

            <div className="flex items-center gap-2">
              {existingFeedbackId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  title="Geri bildirimimi sil"
                >
                  <Trash2 size={14} /> Sil
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <LoadingSpinner size="sm" /> : <Send size={13} />}
                {existingFeedbackId ? 'Güncelle' : 'Gönder'}
              </button>
            </div>
          </div>

          {feedbackSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} /> {feedbackSuccess}
            </div>
          )}
          {feedbackError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} /> {feedbackError}
            </div>
          )}
        </form>
      )}

      {/* Yorum Listesi */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Öğrenci Yorumları ({feedbacks.filter(f => f.comment).length})
        </h4>

        {loading ? (
          <div className="py-6 flex justify-center"><LoadingSpinner size="sm" /></div>
        ) : feedbacks.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-slate-400">Henüz bir geri bildirim bırakılmamış.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">İlk değerlendiren sen ol!</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {feedbacks.map((fb) => {
              const isMine = currentUser && fb.user_id === currentUser.id;
              const isAnon = fb.is_anonymous;
              const authorName = isAnon ? 'Anonim Öğrenci' : fb.profiles?.full_name || 'Öğrenci';
              const authorAvatar = isAnon ? '🕶️' : fb.profiles?.avatar_emoji || '🚀';

              return (
                <div
                  key={fb.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isMine ? 'glass border-violet-500/40 bg-violet-950/10' : 'bg-slate-900/40 border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{authorAvatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{authorName}</span>
                          {isMine && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/40">
                              Sen
                            </span>
                          )}
                          {isAnon && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <EyeOff size={10} /> Gizli
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(fb.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                      fb.rating === 'like'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {fb.rating === 'like' ? <><ThumbsUp size={12} /> Beğendi</> : <><ThumbsDown size={12} /> Geliştirilmeli</>}
                    </span>
                  </div>

                  {fb.comment && (
                    <p className="text-xs text-slate-300 mt-2.5 pl-9 leading-relaxed break-words">
                      "{fb.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
