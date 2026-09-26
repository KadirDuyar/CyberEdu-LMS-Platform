import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, LogOut, ChevronLeft, ChevronRight,
  Star, Zap, Bell, Map, Trophy, Award, Bot, BookOpen,
  BarChart3, Settings, Users, Shield, PlusCircle, Menu, X, Sun, Moon, User, Check, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AiChatWidget from '../components/AiChatWidget';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/socialService';

// ─── Sidebar menü ve kategori konfigürasyonu ──────────────────────────────────
const NAV_SECTIONS = [
  {
    id: 'learning',
    title: 'Müfredat & Eğitim',
    icon: '🎓',
    roles: ['student', 'teacher', 'admin'],
    items: [
      {
        label: 'Kontrol Paneli',
        icon: LayoutDashboard,
        hrefMap: { student: '/student', teacher: '/teacher', admin: '/admin' },
        roles: ['student', 'teacher', 'admin'],
      },
      {
        label: 'Öğrenme Yolculuğum',
        icon: Map,
        href: '/student/learning-path',
        roles: ['student'],
        badge: 'Temel',
      },
      {
        label: 'Haftalık Programlarım',
        icon: Calendar,
        href: '/student/cohorts',
        roles: ['student'],
        badge: 'Sınıf',
      },
      {
        label: 'Kurs Kataloğu',
        icon: BookOpen,
        href: '/student/courses',
        roles: ['student'],
      },
      {
        label: 'Kurslarım',
        icon: BookOpen,
        href: '/teacher/courses',
        roles: ['teacher'],
      },
      {
        label: 'Yeni Kurs',
        icon: PlusCircle,
        href: '/teacher/courses/new',
        roles: ['teacher'],
        end: true,
      },
      {
        label: 'Haftalık Programlar',
        icon: Calendar,
        href: '/teacher/cohorts',
        roles: ['teacher'],
      },
    ],
  },
  {
    id: 'community',
    title: 'Gelişim & Topluluk',
    icon: '🏆',
    roles: ['student'],
    items: [
      {
        label: 'Liderlik Tablosu',
        icon: Trophy,
        href: '/student/leaderboard',
        roles: ['student'],
      },
      {
        label: 'Başarılar',
        icon: Award,
        href: '/student/achievements',
        roles: ['student'],
      },
      {
        label: 'AI Mentor',
        icon: Bot,
        href: '/student/ai-mentor',
        roles: ['student'],
      },
    ],
  },
  {
    id: 'stats',
    title: 'Analiz & Raporlar',
    icon: '📊',
    roles: ['teacher'],
    items: [
      {
        label: 'İstatistikler',
        icon: BarChart3,
        href: '/teacher/stats',
        roles: ['teacher'],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Yönetim & Sistem',
    icon: '🛡️',
    roles: ['admin'],
    items: [
      {
        label: 'Kullanıcılar',
        icon: Users,
        href: '/admin/users',
        roles: ['admin'],
      },
      {
        label: 'Kurs Yönetimi',
        icon: BookOpen,
        href: '/admin/courses',
        roles: ['admin'],
      },
      {
        label: 'Sistem Ayarları',
        icon: Settings,
        href: '/admin/settings',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Hesap',
    icon: '⚙️',
    roles: ['student', 'teacher', 'admin'],
    items: [
      {
        label: 'Profilim',
        icon: User,
        hrefMap: { student: '/student/profile', teacher: '/teacher/profile', admin: '/admin/profile' },
        roles: ['student', 'teacher', 'admin'],
      },
    ],
  },
];

const LEVEL_COLORS = {
  student: 'from-violet-500 to-pink-500',
  teacher: 'from-cyan-500 to-blue-500',
  admin:   'from-amber-500 to-orange-500',
};

const ROLE_LABELS = {
  student: 'Öğrenci',
  teacher: 'Eğitmen',
  admin: 'Sistem Yöneticisi',
};

function SidebarItem({ item, collapsed, userRole }) {
  const location = useLocation();
  const href = item.hrefMap ? item.hrefMap[userRole] : item.href;
  if (!href) return null;

  const isExactRoot = href === '/student' || href === '/teacher' || href === '/admin' || item.end;
  
  // '/teacher/courses' rotası, spesifik '/teacher/courses/new' sayfası açıkken aktifleşmemelidir
  const isExcluded = href === '/teacher/courses' && location.pathname === '/teacher/courses/new';

  return (
    <NavLink
      to={href}
      end={isExactRoot}
      className={({ isActive }) => {
        const active = isActive && !isExcluded;
        return `sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-3' : ''}`;
      }}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={19} className="shrink-0" />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

export default function DashboardLayout({ children }) {
  const { user, profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    const data = await getNotifications(user.id);
    setNotifications(data);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (notif) => {
    if (!notif.is_read) {
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      await markNotificationAsRead(notif.id);
    }
    if (notif.data?.courseId) {
      navigate(`/student/courses/${notif.data.courseId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsRead(user.id);
  };
  
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('cyberedu_theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
      localStorage.setItem('cyberedu_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light-mode');
      localStorage.setItem('cyberedu_theme', 'dark');
    }
  }, [isLightMode]);

  const levelColor  = LEVEL_COLORS[role] || LEVEL_COLORS.student;

  const xp        = profile?.xp ?? 0;
  const level     = profile?.level ?? 1;
  const xpInLevel = xp % 500;
  const xpPercent = Math.round((xpInLevel / 500) * 100);

  const isStudent = role === 'student';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-lg shrink-0 shadow-lg shadow-violet-500/30">
          🔐
        </div>
        {!collapsed && (
          <div>
            <p className="font-display font-black text-sm leading-tight text-gradient">
              CyberEdu
            </p>
            <p className="text-xs text-slate-400 font-medium">Siber Güvenlik LMS</p>
          </div>
        )}
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const sectionItems = section.items.filter((item) => item.roles.includes(role));
          if (sectionItems.length === 0) return null;

          return (
            <div key={section.id} className="space-y-1">
              {!collapsed ? (
                <div className="pt-2 pb-1 px-2.5 first:pt-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </p>
                </div>
              ) : (
                <div className="my-2 border-t border-slate-200 dark:border-white/10 first:border-0" />
              )}

              {sectionItems.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  userRole={role}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Güvenlik rozeti (sadece öğrenciye) */}
      {!collapsed && isStudent && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield size={13} className="text-emerald-400 shrink-0" />
            <p className="text-[10px] text-emerald-400 font-bold">Güvenli Laboratuvar</p>
          </div>
        </div>
      )}

      {/* Kullanıcı Kartı */}
      <div className={`px-3 py-4 border-t border-white/10 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="glass-light rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{profile?.avatar_emoji || (isStudent ? '🚀' : '🎓')}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {profile?.full_name || 'Kullanıcı'}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {ROLE_LABELS[role] || role}
                </p>
              </div>
            </div>

            {/* SADECE ÖĞRENCİYE XP VE SEVİYE ÇUBUĞU */}
            {isStudent && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                  <span>Seviye {level}</span>
                  <span>{xpInLevel}/500 XP</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${levelColor} progress-bar`}
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-rose-400 font-semibold transition-colors w-full pt-1"
            >
              <LogOut size={13} />
              Çıkış Yap
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="p-2 hover:text-rose-400 text-slate-400 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full glass border border-white/20 items-center justify-center text-slate-300 hover:text-white transition-colors z-30 shadow-lg"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </>
  );

  return (
    <div className="flex h-screen animated-bg overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        id="tour-sidebar"
        className={[
          'relative hidden md:flex flex-col h-full glass border-r border-white/10 transition-all duration-300 z-20 shrink-0',
          collapsed ? 'w-[72px]' : 'w-64',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-64 flex flex-col glass border-r border-white/10 z-40 transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Ana İçerik */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="glass border-b border-white/10 px-4 md:px-6 py-4 flex items-center justify-between shrink-0 relative z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-9 h-9 glass-light rounded-xl flex items-center justify-center border border-white/10"
            >
              {mobileOpen ? <X size={18} className="text-slate-300" /> : <Menu size={18} className="text-slate-300" />}
            </button>
            <div>
              <h1 className="font-display font-black text-lg md:text-xl text-slate-900 dark:text-white">
                Merhaba,{' '}
                <span className="text-gradient">
                  {profile?.full_name?.split(' ')[0] || 'Kullanıcı'}{' '}
                  {profile?.avatar_emoji || (isStudent ? '🚀' : '🎓')}
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div id="tour-profile-section" className="flex items-center gap-2 md:gap-3">
            {/* SADECE ÖĞRENCİDE GÖRÜNEN LEVEL/XP KUTUSU */}
            {isStudent && (
              <div id="tour-xp" className="hidden sm:flex items-center gap-2 glass-light rounded-xl px-3 md:px-4 py-2 border border-slate-200 dark:border-white/10">
                <Star size={15} className="text-amber-500 dark:text-amber-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Lv.{level}</span>
                <span className="w-px h-4 bg-slate-300 dark:bg-white/20" />
                <Zap size={15} className="text-violet-500 dark:text-violet-400" />
                <span className="text-sm font-bold text-violet-600 dark:text-violet-300">
                  {xp.toLocaleString('tr-TR')} XP
                </span>
              </div>
            )}

            {/* Tema Butonu */}
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold transition-all shadow-sm cursor-pointer select-none"
              title={isLightMode ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
            >
              {isLightMode ? (
                <>
                  <span className="text-slate-800 font-bold">Açık Tema</span>
                  <Sun size={15} className="text-amber-500 shrink-0" />
                </>
              ) : (
                <>
                  <span className="text-slate-200 font-bold">Koyu Tema</span>
                  <Moon size={15} className="text-cyan-300 shrink-0" />
                </>
              )}
            </button>

            {/* Bildirim */}
            <div id="tour-notifications" className="relative">
              <button
                onClick={() => setNotifOpen((n) => !n)}
                className="w-9 h-9 glass-light rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 hover:border-violet-500/50 transition-colors relative"
                title="Bildirimler"
              >
                <Bell size={17} className="text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-12 w-80 sm:w-88 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/90 rounded-2xl p-4 z-[100] shadow-2xl dark:shadow-black/95 animate-scale-up"
                  onMouseLeave={() => setNotifOpen(false)}
                >
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Bildirimler</p>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                          {unreadCount} yeni
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-bold transition-colors flex items-center gap-1"
                      >
                        <Check size={12} /> Tümünü Oku
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/5">
                        <span className="text-2xl block mb-1">🔔</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Henüz yeni bir bildiriminiz yok.</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const icon =
                          n.type === 'course_feedback' ? '💬' :
                          n.type === 'new_follower' ? '🤝' :
                          n.type === 'friend_completed_course' ? '🎓' : '🛡️';

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n)}
                            className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              !n.is_read
                                ? 'bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-500/50 hover:bg-violet-100/60 dark:hover:bg-violet-900/60 shadow-md'
                                : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                            }`}
                          >
                            <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs truncate ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                  {n.title}
                                </p>
                                {!n.is_read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                                {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Kutusu (Tıklanabilir Profil) */}
            <button
              id="tour-profile"
              onClick={() => navigate(role === 'teacher' ? '/teacher/profile' : role === 'admin' ? '/admin/profile' : '/student/profile')}
              className="w-9 h-9 glass-light rounded-xl flex items-center justify-center border border-white/10 text-lg hover:border-violet-500/60 hover:scale-105 transition-all cursor-pointer"
              title="Profil Sayfam"
            >
              {profile?.avatar_emoji || (isStudent ? '🚀' : '🎓')}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Sağ Altta Kayan AI Chat Asistanı */}
      <AiChatWidget />
    </div>
  );
}