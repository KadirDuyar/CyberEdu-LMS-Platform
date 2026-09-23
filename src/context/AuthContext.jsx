import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import RoleSelectModal from '../components/auth/RoleSelectModal';

// ─── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── AuthProvider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // Supabase auth user
  const [profile, setProfile] = useState(null);   // profiles tablosundan ek bilgiler
  const [loading, setLoading] = useState(true);   // başlangıçta session kontrol ediliyor
  const [error, setError]     = useState('');

  // ── Profil yükle ─────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId) => {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (err) {
      console.error('Profil yüklenemedi:', err.message);
      return null;
    }
    return data;
  }, []);

  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  // ── Oturum başlatma / değişim dinleyicisi ─────────────────────────────────────
  useEffect(() => {
    // İlk yükleme: mevcut oturumu sunucudan doğrula
    supabase.auth.getUser().then(async ({ data: { user: verifiedUser }, error: userErr }) => {
      if (userErr || !verifiedUser) {
        // Oturum geçersiz veya kullanıcı DB'de bulunmuyorsa temizle
        if (userErr && !userErr.message?.includes('Auth session missing')) {
          await supabase.auth.signOut();
        }
        setUser(null);
        setProfile(null);
        setNeedsRoleSelection(false);
        setLoading(false);
        return;
      }

      setUser(verifiedUser);
      let prof = await fetchProfile(verifiedUser.id);

      if (!prof || !prof.role) {
        const intentRole = localStorage.getItem('cyberedu_oauth_intent_role');
        if (intentRole) {
          const fullName = verifiedUser.user_metadata?.full_name || verifiedUser.email?.split('@')[0] || 'Kullanıcı';
          const { data: newProf } = await supabase.from('profiles').upsert({
            id: verifiedUser.id,
            full_name: fullName,
            role: intentRole,
            avatar_emoji: intentRole === 'teacher' ? '🎓' : '🚀',
            xp: 0,
            level: 1,
            onboarding_completed: intentRole === 'teacher'
          }).select().single();
          localStorage.removeItem('cyberedu_oauth_intent_role');
          if (newProf) prof = newProf;
        } else {
          // E-posta veritabanında henüz kayıtlı değilse rol seçimi için register sayfasına yönlendir
          sessionStorage.setItem('cyberedu_google_signup_email', verifiedUser.email || '');
          sessionStorage.setItem('cyberedu_google_signup_name', verifiedUser.user_metadata?.full_name || verifiedUser.user_metadata?.name || '');
          if (window.location.pathname !== '/register') {
            window.location.href = '/register?google_signup=1';
            return;
          }
        }
      }

      if (prof && !prof.onboarding_completed) {
        try {
          localStorage.removeItem(`cyberedu_last_active_course_${prof.id}`);
          localStorage.removeItem('cyberedu_last_active_course');
          localStorage.removeItem(`cyberedu_tour_completed_${prof.id}`);
          localStorage.removeItem('cyberedu_tour_completed');
        } catch (e) {}
      }

      setProfile(prof);
      setLoading(false);
    });

    // Auth durumu değişikliklerini dinle (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser((prev) => (prev?.id === session.user.id ? prev : session.user));
          }
          return;
        }

        if (session?.user) {
          setUser((prev) => (prev?.id === session.user.id ? prev : session.user));
          let prof = await fetchProfile(session.user.id);

          if (!prof || !prof.role) {
            const intentRole = localStorage.getItem('cyberedu_oauth_intent_role');
            if (intentRole) {
              const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kullanıcı';
              const { data: newProf } = await supabase.from('profiles').upsert({
                id: session.user.id,
                full_name: fullName,
                role: intentRole,
                avatar_emoji: intentRole === 'teacher' ? '🎓' : '🚀',
                xp: 0,
                level: 1,
                onboarding_completed: intentRole === 'teacher'
              }).select().single();
              localStorage.removeItem('cyberedu_oauth_intent_role');
              if (newProf) prof = newProf;
            } else {
              // Veritabanında profili olmayan yeni Google kullanıcısı -> Doğrudan Register sayfasına yönlendir
              sessionStorage.setItem('cyberedu_google_signup_email', session.user.email || '');
              sessionStorage.setItem('cyberedu_google_signup_name', session.user.user_metadata?.full_name || session.user.user_metadata?.name || '');
              if (window.location.pathname !== '/register') {
                window.location.href = '/register?google_signup=1';
                return;
              }
            }
          }

          if (prof && !prof.onboarding_completed) {
            try {
              localStorage.removeItem(`cyberedu_last_active_course_${prof.id}`);
              localStorage.removeItem('cyberedu_last_active_course');
              localStorage.removeItem(`cyberedu_tour_completed_${prof.id}`);
              localStorage.removeItem('cyberedu_tour_completed');
            } catch (e) {}
          }

          setProfile((prev) => {
            if (prev && JSON.stringify(prev) === JSON.stringify(prof)) return prev;
            return prof;
          });
        } else {
          setUser(null);
          setProfile(null);
          setNeedsRoleSelection(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setError('');
    setLoading(true);

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (err) {
      // Güvenli hata mesajları — Supabase'in iç hata detaylarını kullanıcıya gösterme
      if (err.message.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
      } else if (err.message.includes('Email not confirmed')) {
        setError('E-posta adresin henüz doğrulanmamış.');
      } else {
        setError('Giriş yapılamadı. Lütfen daha sonra tekrar deneyin.');
      }
      return { success: false };
    }

    return { success: true, user: data.user };
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────────
  const register = useCallback(async ({ email, password, fullName, role }) => {
    setError('');
    setLoading(true);

    // Supabase'e kayıt ol
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (signUpErr) {
      setLoading(false);
      if (signUpErr.message.includes('already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı.');
      } else {
        setError('Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
      return { success: false };
    }

    // Profile kaydını oluştur (Supabase trigger yoksa manuel olarak)
    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        role,
        avatar_emoji: role === 'teacher' ? '🎓' : '🚀',
        xp: 0,
        level: 1,
        onboarding_completed: false,
      });

      if (profileErr) {
        console.error('Profil oluşturulamadı:', profileErr.message);
      }
    }

    setLoading(false);
    return { success: true, user: data.user };
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setError('');
  }, []);

  // ── XP Ekle (Doğrudan DB'den güncel XP'yi okur, günceller ve hatayı döndürür) ─
  const addXP = useCallback(async (amount) => {
    if (!profile) return { error: new Error('Profil bulunamadı') };

    try {
      // 1. Güncel XP'yi doğrudan veritabanından al
      const { data: currentProf, error: fetchErr } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', profile.id)
        .single();

      if (fetchErr) {
        console.error('Güncel profil XP alınamadı:', fetchErr.message);
        return { error: fetchErr };
      }

      const currentXP = currentProf?.xp ?? profile.xp ?? 0;
      const newXP     = currentXP + amount;
      const newLevel  = Math.floor(newXP / 500) + 1;

      // 2. DB'ye yaz
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ xp: newXP, level: newLevel, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (updateErr) {
        console.error('XP güncellenemedi:', updateErr.message);
        return { error: updateErr };
      }

      // 3. UI state güncelle
      setProfile((prev) => ({ ...prev, xp: newXP, level: newLevel }));
      return { success: true, newXP, newLevel };
    } catch (err) {
      console.error('addXP beklenmeyen hata:', err);
      return { error: err };
    }
  }, [profile]);

  // ── Profili yenile ────────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await fetchProfile(user.id);
    setProfile(prof);
  }, [user, fetchProfile]);

  // ── Onboarding tamamla ────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async ({ learningArea, skillLevel }) => {
    if (!profile) return;

    const { data } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        learning_area: learningArea,
        skill_level: skillLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (data) setProfile(data);
  }, [profile]);

  // ── Profili güncelle (isim, avatar_emoji, alan vb.) ─────────────────────────
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { error: new Error('Kullanıcı oturumu bulunamadı') };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error('Profil güncellenemedi:', error.message);
      return { error };
    }

    if (data && data.length > 0) {
      setProfile(data[0]);
      return { data: data[0], error: null };
    }
    
    // Fallback: fetch again if select() empty due to RLS
    await refreshProfile();
    return { data: null, error: null };
  }, [user, refreshProfile]);

  const value = {
    // Supabase auth user (id, email vb.)
    user,
    // profiles tablosundan gelen ek bilgiler (role, xp, level, name vb.)
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    needsRoleSelection,
    // Kolaylık için profile'dan role'ü doğrudan aç
    role: profile?.role ?? null,
    login,
    register,
    logout,
    addXP,
    refreshProfile,
    completeOnboarding,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {needsRoleSelection && user && (
        <RoleSelectModal
          user={user}
          onRoleSelected={(newProf) => {
            setProfile(newProf);
            setNeedsRoleSelection(false);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

// ─── Custom Hook ───────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, <AuthProvider> içinde kullanılmalıdır.');
  return ctx;
}

export default AuthContext;
