import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute – Yetkisiz kullanıcıları /login'e yönlendirir.
 * allowedRoles prop'u verilirse o roller dışındaki kullanıcılar
 * kendi dashboard'larına yönlendirilir.
 *
 * AuthContext loading durumunda (Supabase session kontrol ederken)
 * boş bir yükleme ekranı gösterir.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  // Supabase session henüz kontrol ediliyorsa bekle
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center animated-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-2xl animate-pulse">
            🔐
          </div>
          <p className="text-slate-400 text-sm">Oturum kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Giriş yapılmamışsa → login (gelinen sayfayı state'e kaydet)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rol kısıtlaması varsa kontrol et
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const redirect =
      role === 'admin'   ? '/admin'   :
      role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
