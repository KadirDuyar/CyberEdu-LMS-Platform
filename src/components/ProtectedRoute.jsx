import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute – Yetkisiz kullanıcıları /login'e yönlendirir.
 * allowedRoles prop'u verilirse o roller dışındaki kullanıcılar
 * kendi dashboard'larına yönlendirilir.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Giriş yapılmamışsa → login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rol kısıtlaması varsa kontrol et
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Kendi dashboard'una yönlendir
    const redirect =
      user.role === 'admin'   ? '/admin'   :
      user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
