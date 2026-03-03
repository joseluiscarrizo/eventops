import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPageUrl } from './utils';
import { ClipboardList, FileText, Menu, X, UserCog, UserPlus, Clock, Users, LayoutDashboard, MessageCircle, ChevronDown, ChevronLeft, Smartphone, CalendarRange, ShieldCheck, Settings } from 'lucide-react';

// ── Bottom Tabs ───────────────────────────────────────────
const BOTTOM_TABS = [
  { label: 'Dashboard', page: 'DashboardCoordinador', icon: LayoutDashboard },
  { label: 'Pedidos',   page: 'Pedidos',              icon: ClipboardList },
  { label: 'Personal',  page: 'Camareros',            icon: Users },
  { label: 'Chat',      page: 'Comunicacion',         icon: MessageCircle },
  { label: 'Ajustes',   page: 'ConfiguracionCuenta',  icon: Settings },
];

const TAB_PAGES = new Set(BOTTOM_TABS.map(t => t.page));

// Sub-pages that belong to a primary tab (for back-button and last-visited memory)
const PAGE_PARENT = {
  PerfilCamarero:        'Camareros',
  Asignacion:            'Pedidos',
  Clientes:              'Pedidos',
  HistorialMensajes:     'Comunicacion',
  Chat:                  'Comunicacion',
  TiempoReal:            'Dashboard',
  TableroEventos:        'Dashboard',
  VistaMovil:            'Dashboard',
  Informes:              'Dashboard',
  Coordinadores:         'ConfiguracionCuenta',
  Altas:                 'ConfiguracionCuenta',
  PreferenciasNotificaciones: 'ConfiguracionCuenta',
  ConfiguracionNotificaciones: 'ConfiguracionCuenta',
};

// ── BottomNav with last-visited sub-route memory ──────────
function BottomNav({ currentPageName }) {
  const location = useLocation();
  // Remember the last full path for each primary tab
  const lastVisited = useRef({});

  useEffect(() => {
    // If current page is a primary tab page, record its URL
    if (TAB_PAGES.has(currentPageName)) {
      lastVisited.current[currentPageName] = location.pathname + location.search;
    }
    // If it's a sub-page, record on the parent tab
    const parent = PAGE_PARENT[currentPageName];
    if (parent && TAB_PAGES.has(parent)) {
      lastVisited.current[parent] = location.pathname + location.search;
    }
  }, [currentPageName, location]);

  const getTabHref = (tab) => {
    // If we remember a sub-page for this tab, navigate back there
    return lastVisited.current[tab.page] || createPageUrl(tab.page);
  };

  // Determine which tab is "active" (primary tab or its sub-page)
  const activeTab = TAB_PAGES.has(currentPageName)
    ? currentPageName
    : PAGE_PARENT[currentPageName] || null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-amber-100 bottom-nav flex items-stretch">
      {BOTTOM_TABS.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.page;
        return (
          <Link
            key={tab.page}
            to={getTabHref(tab)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
              active ? 'text-orange-700' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className={`text-[10px] font-medium ${active ? 'text-orange-700' : 'text-stone-400'}`}>
              {tab.label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-700 rounded-b-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationBell from './components/notificaciones/NotificationBell';
import { useWebPushNotifications } from './components/notificaciones/WebPushService';
import RateLimitHandler from './components/notificaciones/RateLimitHandler';
import { useBackgroundServices } from './hooks/useBackgroundServices';

const clientesSubmenu = [
  { name: 'Alta Cliente', page: 'Clientes', icon: Users },
  { name: 'Pedidos', page: 'Pedidos', icon: ClipboardList },
  { name: 'Asignación', page: 'Asignacion', icon: UserCog },
];

const herramientasSubmenu = [
  { name: 'Tiempo Real', page: 'TiempoReal', icon: Clock },
  { name: 'Tablero Eventos', page: 'TableroEventos', icon: CalendarRange },
  { name: 'Vista Móvil', page: 'VistaMovil', icon: Smartphone },
  { name: 'Informes', page: 'Informes', icon: FileText },
];

const comunicacionSubmenu = [
  { name: 'Comunicación', page: 'Comunicacion', icon: MessageCircle },
  { name: 'WhatsApp', page: 'HistorialMensajes', icon: MessageCircle }
];

const adminSubmenu = [
  { name: 'Coordinadores', page: 'Coordinadores', icon: UserCog },
  { name: 'Altas', page: 'Altas', icon: ClipboardList },
];

// Back-button label map
const BACK_LABELS = {
  PerfilCamarero: 'Personal',
  Asignacion: 'Pedidos',
  Clientes: 'Inicio',
  HistorialMensajes: 'Comunicación',
  Chat: 'Comunicación',
  TiempoReal: 'Dashboard',
  TableroEventos: 'Dashboard',
  VistaMovil: 'Dashboard',
  Informes: 'Dashboard',
  Coordinadores: 'Ajustes',
  Altas: 'Ajustes',
  PreferenciasNotificaciones: 'Ajustes',
  ConfiguracionNotificaciones: 'Ajustes',
};

function useDarkMode() {
  useEffect(() => {
    const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}

function PageTransitionWrapper({ children, currentPageName }) {
  const location = useLocation();
  const isTabPage = TAB_PAGES.has(currentPageName);
  return (
    <motion.div
      key={location.pathname + location.search}
      initial={isTabPage ? { x: 16, opacity: 0 } : { opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showNotification, isAllowed, requestPermission } = useWebPushNotifications();
  const navigate = useNavigate();
  useDarkMode();

  useBackgroundServices({ showPushNotifications: isAllowed ? showNotification : null });

  React.useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const timer = setTimeout(() => requestPermission(), 3000);
      return () => clearTimeout(timer);
    }
  }, [requestPermission]);

  const isSubPage = !!BACK_LABELS[currentPageName];
  const isRootPage = TAB_PAGES.has(currentPageName);
  const backLabel = BACK_LABELS[currentPageName] || 'Volver';
  const parentPage = PAGE_PARENT[currentPageName];

  const handleBack = () => {
    // Try browser back first; fall back to parent page
    if (globalThis.history.length > 1) {
      navigate(-1);
    } else if (parentPage) {
      navigate(createPageUrl(parentPage));
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/60">
      <style>{`
        :root {
          --background: 33 30% 98%;
          --foreground: 20 20% 14%;
          --card: 0 0% 100%;
          --card-foreground: 20 20% 14%;
          --popover: 0 0% 100%;
          --popover-foreground: 20 20% 14%;
          --primary: 22 80% 38%;
          --primary-foreground: 30 100% 98%;
          --secondary: 34 35% 93%;
          --secondary-foreground: 20 15% 20%;
          --muted: 34 25% 94%;
          --muted-foreground: 25 15% 46%;
          --accent: 34 35% 92%;
          --accent-foreground: 20 15% 20%;
          --border: 30 20% 87%;
          --input: 30 20% 87%;
          --ring: 22 80% 38%;
          --radius: 0.6rem;
        }
        body { background-color: hsl(33, 30%, 98%) !important; }
        @media (max-width: 767px) {
          button { min-height: 44px; }
          button[data-size="icon"], .btn-no-min-h { min-height: unset; }
        }
      `}</style>

      <RateLimitHandler />

      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-50 safe-area-top">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Left: Logo on root pages, Back button on sub-pages (mobile) */}
            <div className="flex items-center gap-3">
              {/* Back button — mobile only, sub-pages only */}
              {isSubPage && (
                <button
                  onClick={handleBack}
                  className="md:hidden flex items-center gap-1 text-orange-700 font-medium text-sm btn-no-min-h min-h-0 px-0"
                  style={{ minHeight: 0 }}
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>{backLabel}</span>
                </button>
              )}

              {/* Logo: always visible on desktop, only on root pages on mobile */}
              <div className={`flex items-center gap-3 ${isSubPage ? 'hidden md:flex' : 'flex'}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-700 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-700/20">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-slate-800">Staff Coordinator</h1>
                  <p className="text-xs text-slate-500">Gestión de Camareros</p>
                </div>
              </div>

              {/* Page title on mobile sub-pages */}
              {isSubPage && (
                <span className="md:hidden text-base font-semibold text-slate-800 truncate max-w-[180px]">
                  {currentPageName === 'PerfilCamarero' ? 'Perfil' : backLabel === currentPageName ? '' : currentPageName}
                </span>
              )}
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to={createPageUrl('DashboardCoordinador')}>
                <Button
                  variant={currentPageName === 'DashboardCoordinador' ? 'default' : 'ghost'}
                  className={currentPageName === 'DashboardCoordinador'
                    ? 'bg-orange-700 text-white hover:bg-orange-800'
                    : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['Clientes', 'Pedidos', 'Asignacion'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['Clientes', 'Pedidos', 'Asignacion'].includes(currentPageName)
                      ? 'bg-orange-700 text-white hover:bg-orange-800'
                      : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Clientes
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {clientesSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to={createPageUrl('Camareros')}>
                <Button
                  variant={currentPageName === 'Camareros' ? 'default' : 'ghost'}
                  className={currentPageName === 'Camareros'
                    ? 'bg-orange-700 text-white hover:bg-orange-800'
                    : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Personal
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['Coordinadores', 'Altas'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['Coordinadores', 'Altas'].includes(currentPageName)
                      ? 'bg-orange-700 text-white hover:bg-orange-800'
                      : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Admin
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {adminSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['TiempoReal', 'TableroEventos', 'VistaMovil', 'Informes'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['TiempoReal', 'TableroEventos', 'VistaMovil', 'Informes'].includes(currentPageName)
                      ? 'bg-orange-700 text-white hover:bg-orange-800'
                      : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'}
                  >
                    <CalendarRange className="w-4 h-4 mr-2" />
                    Herramientas
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {herramientasSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={['Comunicacion', 'Chat', 'HistorialMensajes'].includes(currentPageName) ? 'default' : 'ghost'}
                    className={['Comunicacion', 'Chat', 'HistorialMensajes'].includes(currentPageName)
                      ? 'bg-orange-700 text-white hover:bg-orange-800'
                      : 'text-stone-600 hover:text-orange-700 hover:bg-orange-50'}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comunicación
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {comunicacionSubmenu.map(item => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="ml-2 border-l border-slate-200 pl-2 flex items-center gap-2">
                {!isAllowed && typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <Button
                    size="sm"
                    onClick={requestPermission}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                  >
                    🔔 Activar Notificaciones
                  </Button>
                )}
                <NotificationBell />
              </div>
            </nav>

            {/* Mobile: notification bell + hamburger (only on root pages) */}
            <div className="md:hidden flex items-center gap-1">
              {isRootPage && <NotificationBell />}
              {isRootPage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="btn-no-min-h"
                  style={{ minHeight: 0 }}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3">
            <Link to={createPageUrl('DashboardCoordinador')} onClick={() => setMobileMenuOpen(false)}>
              <Button variant={currentPageName === 'DashboardCoordinador' ? 'default' : 'ghost'}
                className={`w-full justify-start mb-1 ${currentPageName === 'DashboardCoordinador' ? 'bg-orange-700 text-white' : 'text-stone-600'}`}>
                <LayoutDashboard className="w-4 h-4 mr-2" />Dashboard
              </Button>
            </Link>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">CLIENTES</div>
              {clientesSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page ? 'bg-orange-700 text-white' : 'text-stone-600'}`}>
                    <item.icon className="w-4 h-4 mr-2" />{item.name}
                  </Button>
                </Link>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <Link to={createPageUrl('Camareros')} onClick={() => setMobileMenuOpen(false)}>
                <Button variant={currentPageName === 'Camareros' ? 'default' : 'ghost'}
                  className={`w-full justify-start mb-1 ${currentPageName === 'Camareros' ? 'bg-orange-700 text-white' : 'text-stone-600'}`}>
                  <UserPlus className="w-4 h-4 mr-2" />Personal
                </Button>
              </Link>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">ADMIN</div>
              {adminSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page ? 'bg-orange-700 text-white' : 'text-stone-600'}`}>
                    <item.icon className="w-4 h-4 mr-2" />{item.name}
                  </Button>
                </Link>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">HERRAMIENTAS</div>
              {herramientasSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page ? 'bg-orange-700 text-white' : 'text-stone-600'}`}>
                    <item.icon className="w-4 h-4 mr-2" />{item.name}
                  </Button>
                </Link>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2 px-3">COMUNICACIÓN</div>
              {comunicacionSubmenu.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={currentPageName === item.page ? 'default' : 'ghost'}
                    className={`w-full justify-start mb-1 ${currentPageName === item.page ? 'bg-orange-700 text-white' : 'text-stone-600'}`}>
                    <item.icon className="w-4 h-4 mr-2" />{item.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="pb-16 md:pb-0">
        <PageTransitionWrapper currentPageName={currentPageName}>
          {children}
        </PageTransitionWrapper>
      </main>

      <BottomNav currentPageName={currentPageName} />
    </div>
  );
}