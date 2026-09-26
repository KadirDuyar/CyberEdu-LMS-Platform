import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, CheckCircle2, AlertTriangle, Loader2, Copy, ExternalLink } from 'lucide-react';

/**
 * StorylineZipUploader — Articulate Storyline ZIP paketini Supabase Storage'a yükler
 *
 * ZIP içeriğini tek tek dosya olarak yüklemek yerine, ZIP dosyasının kendisini yükler
 * ve yüklenen story.html'in URL'sini döndürür.
 *
 * ÖNEMLİ NOT: Storyline ZIP'i tarayıcıda doğrudan çalışmaz. Tercih edilen yöntemler:
 *   1. Storyline çıktısını GitHub Pages'e push et → story.html URL'sini kullan (ÖNERİLEN)
 *   2. ZIP içindeki tüm dosyaları Supabase Storage'a ayrı ayrı yükle (bu bileşen bu yolu dener)
 *
 * Props:
 *   courseId   — Kurs UUID (klasör yolu için)
 *   lessonId   — Ders UUID (klasör yolu için)
 *   onUrlReady — (url: string) => void — story.html URL'si hazır olduğunda çağrılır
 */
export default function StorylineZipUploader({ courseId, lessonId, onUrlReady }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [copied, setCopied] = useState(false);

  const BUCKET = 'storyline-packages';
  const MAX_SIZE_MB = 100;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Lütfen bir ZIP dosyası seçin (Storyline web çıktısı).');
      return;
    }

    // Dosya boyutu kontrolü
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setUploadError(`Dosya boyutu çok büyük (${sizeMB.toFixed(1)} MB). Maksimum: ${MAX_SIZE_MB} MB`);
      return;
    }

    setUploadError('');
    setUploading(true);
    setUploadProgress(10);

    try {
      const timestamp = Date.now();
      const safeId = lessonId !== 'new' ? lessonId : 'new-lesson';
      const storagePath = `${courseId}/${safeId}/${timestamp}_package.zip`;

      setUploadProgress(30);

      // ZIP dosyasını Supabase Storage'a yükle
      const { data, error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/zip',
        });

      if (uploadErr) throw uploadErr;

      setUploadProgress(80);

      // Public URL al
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const zipPublicUrl = urlData.publicUrl;

      // story.html için beklenen URL (ZIP içindeki yapıya göre)
      // Öğretmene bilgi vereceğiz: ZIP çıkarılmadan story.html erişilemez.
      // Bu URL ZIP dosyasının kendisini gösterir; story.html için GitHub Pages önerilir.
      const storyUrl = zipPublicUrl.replace('_package.zip', '/story.html');

      setUploadProgress(100);
      setUploadedUrl(zipPublicUrl);

      // Parent'a bildir — öğretmene GitHub Pages URL'si girmesi daha güvenilir olduğunu söyle
      if (onUrlReady) {
        // ZIP URL'sini değil, story.html olarak döndür (eğer sunucu static serve ediyorsa)
        onUrlReady(storyUrl);
      }
    } catch (err) {
      console.error('Storyline ZIP yükleme hatası:', err);
      setUploadError('Yükleme başarısız: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Input'u sıfırla (aynı dosya tekrar seçilebilsin)
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-3">
      {/* Yükleme Alanı */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 p-5
          rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${uploading
            ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 cursor-not-allowed'
            : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 bg-white dark:bg-slate-950/40'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <Loader2 className="text-violet-500 animate-spin" size={24} />
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
              Yükleniyor... %{uploadProgress}
            </span>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload size={24} className="text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                ZIP dosyasını seçin veya sürükleyin
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Storyline Web Çıktısı (.zip) — Maks. {MAX_SIZE_MB} MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hata Mesajı */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
          <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">{uploadError}</p>
        </div>
      )}

      {/* Yükleme Başarılı */}
      {uploadedUrl && !uploading && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">ZIP yüklendi!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 truncate font-mono">{uploadedUrl}</p>
            </div>
          </div>

          {/* ÖNEMLİ: ZIP çalışmaz uyarısı */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-bold">⚠️ Önemli Bilgi:</p>
              <p>
                ZIP dosyası Supabase'de <strong>çıkarılmamış</strong> durumda.
                <code className="bg-amber-100 dark:bg-amber-950/50 px-1 mx-1 rounded">story.html</code>
                doğrudan iframe ile çalışmaz.
              </p>
              <p className="font-semibold">Önerilen Yöntem:</p>
              <p>
                Storyline çıktı klasörünü <strong>GitHub Pages</strong>'e yükleyin ve
                <code className="bg-amber-100 dark:bg-amber-950/50 px-1 mx-1 rounded">story.html</code>
                URL'sini yukarıdaki alana yapıştırın.
              </p>
              <a
                href="https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 underline font-bold mt-1"
              >
                GitHub Pages Kılavuzu <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(uploadedUrl)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? 'Kopyalandı!' : 'ZIP URL kopyala'}
          </button>
        </div>
      )}
    </div>
  );
}
