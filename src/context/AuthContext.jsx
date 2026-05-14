import { createContext, useContext, useState, useCallback } from 'react';

// ─── Mock User Database ────────────────────────────────────────────────────────
// Backend olmadığı için sahte kullanıcılar burada tanımlıdır.
// E-posta'ya göre rol belirlenir: admin@ → admin, ogretmen@ → teacher, geri kalan → student
const MOCK_USERS = {
  'ogrenci@demo.com': {
    id: 'u001',
    name: 'Ahmet Yılmaz',
    email: 'ogrenci@demo.com',
    role: 'student',
    level: 3,
    xp: 1250,
    avatar: '🚀',
    badges: ['first_login', 'quiz_master'],
  },
  'ogretmen@demo.com': {
    id: 'u002',
    name: 'Ayşe Kaya',
    email: 'ogretmen@demo.com',
    role: 'teacher',
    level: 10,
    xp: 9800,
    avatar: '🎓',
    badges: [],
  },
  'admin@demo.com': {
    id: 'u003',
    name: 'Sistem Yöneticisi',
    email: 'admin@demo.com',
    role: 'admin',
    level: 99,
    xp: 99999,
    avatar: '⚙️',
    badges: [],
  },
};

// ─── Helper: E-postaya göre rol çıkar ─────────────────────────────────────────
function inferRoleFromEmail(email) {
  const prefix = email.split('@')[0].toLowerCase();
  if (prefix === 'admin')     return 'admin';
  if (prefix === 'ogretmen')  return 'teacher';
  return 'student';
}

// ─── Context Definition ────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── AuthProvider Component ────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  /**
   * Mock login: e-posta + şifre alır, MOCK_USERS'dan kullanıcıyı bulur.
   * Bilinmeyen e-posta için rol tahmini yapıp genel bir kullanıcı oluşturur.
   * Şifre kontrolü: şimdilik her şifre kabul edilir (minimum 6 karakter).
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');

    // Simüle edilmiş ağ gecikmesi (500ms)
    await new Promise((r) => setTimeout(r, 500));

    // Basit validasyon
    if (!email || !password) {
      setError('E-posta ve şifre alanları boş bırakılamaz.');
      setLoading(false);
      return { success: false };
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      setLoading(false);
      return { success: false };
    }

    // Kullanıcıyı bul ya da dinamik olarak oluştur
    const foundUser = MOCK_USERS[email.toLowerCase()];
    if (foundUser) {
      setUser(foundUser);
    } else {
      // Bilinmeyen kullanıcı → rolü e-postadan çıkar
      const role = inferRoleFromEmail(email);
      setUser({
        id: `u_${Date.now()}`,
        name: email.split('@')[0],
        email,
        role,
        level: 1,
        xp: 0,
        avatar: role === 'teacher' ? '🎓' : role === 'admin' ? '⚙️' : '🚀',
        badges: [],
      });
    }

    setLoading(false);
    return { success: true };
  }, []);

  /** Oturumu kapat */
  const logout = useCallback(() => {
    setUser(null);
    setError('');
  }, []);

  /** XP güncelleme yardımcısı (ilerleyen aşamalarda kullanılacak) */
  const addXP = useCallback((amount) => {
    setUser((prev) => {
      if (!prev) return prev;
      const newXP    = prev.xp + amount;
      const newLevel = Math.floor(newXP / 500) + 1;
      return { ...prev, xp: newXP, level: newLevel };
    });
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    addXP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Custom Hook ───────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

export default AuthContext;
