import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Users,
  QrCode,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Building2,
  ClipboardList,
  UserCog,
  BarChart2,
  Settings,
  User,
  MessageSquare,
  Bot,
  Bell,
  ChevronLeft
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import BottomTabBar from "@/components/BottomTabBar";
import { base44 } from "@/api/base44Client";
import { RoleProvider, useAppRole, CAN } from "@/components/auth/useAppRole";

const ALL_NAV = [
  { label: "Dashboard",    page: "Dashboard",    icon: LayoutDashboard, permission: null },
  { label: "Eventos",      page: "Events",       icon: Calendar,        permission: "manageEvents" },
  { label: "Staff",        page: "Staff",        icon: Users,           permission: "managePersonal" },
  { label: "Clientes",     page: "Clients",      icon: Building2,       permission: "manageClients" },
  { label: "Pedidos",      page: "Orders",       icon: ClipboardList,   permission: "manageOrders" },
  { label: "Personal",     page: "Personal",     icon: UserCog,         permission: "managePersonal" },

  { label: "Mi horario",   page: "MiHorario",    icon: User,            permission: null },
  { label: "Chat",         page: "Chat",          icon: MessageSquare,   permission: null },
  { label: "Notificaciones", page: "Notificaciones", icon: Bell,            permission: null },
  { label: "Chatbot Clientes", page: "ClientChatbot", icon: Bot,             permission: "manageClients" },
  { label: "Informes",     page: "Informes",     icon: BarChart2,       permission: "viewReports" },
  { label: "Calendario",   page: "CalendarSync", icon: Calendar,        permission: "manageEvents" },
  { label: "Check-in QR",  page: "CheckIn",      icon: QrCode,          permission: "manageEvents" },
  { label: "Configuración",page: "Settings",     icon: Settings,        permission: "manageSettings" },
];

function SidebarContent({ currentPageName, onClose }) {
  const { role } = useAppRole();

  const navItems = ALL_NAV.filter(item => {
    if (!item.permission) return true;
    return CAN[item.permission]?.(role) ?? true;
  });

  return (
    <>
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">EventOps</span>
        </div>
        <button className="ml-auto lg:hidden" onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, page, icon: Icon }) => {
          const active = currentPageName === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-400">Notificaciones</span>
          <NotificationBell />
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

const BOTTOM_TAB_PAGES = ["Dashboard", "Events", "Orders", "Personal", "MiHorario"];

function LayoutInner({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isBottomTab = BOTTOM_TAB_PAGES.includes(currentPageName);

  return (
    <div className="min-h-screen bg-background flex">
      <style>{`
        :root { --brand: #6366f1; --brand-dark: #4f46e5; }
      `}</style>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:flex
      `}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <SidebarContent currentPageName={currentPageName} onClose={() => setSidebarOpen(false)} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="lg:hidden h-14 bg-background border-b border-border flex items-center px-4 gap-3"
          style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
        >
          {!isBottomTab ? (
            <button onClick={() => window.history.back()} className="p-1 -ml-1 text-gray-600 dark:text-gray-300">
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="p-1 -ml-1">
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <span className="font-semibold text-gray-900 dark:text-gray-100">EventOps</span>
          <div className="ml-auto"><NotificationBell /></div>
        </header>

        <main
          className="flex-1 p-4 lg:p-8 overflow-y-auto"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 4rem)" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomTabBar currentPageName={currentPageName} />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <RoleProvider>
      <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>
    </RoleProvider>
  );
}