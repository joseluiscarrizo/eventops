import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  CalendarClock,
  User,
  MessageSquare
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { base44 } from "@/api/base44Client";
import { RoleProvider, useAppRole, CAN } from "@/components/auth/useAppRole";

const ALL_NAV = [
  { label: "Dashboard",    page: "Dashboard",    icon: LayoutDashboard, permission: null },
  { label: "Eventos",      page: "Events",       icon: Calendar,        permission: "manageEvents" },
  { label: "Staff",        page: "Staff",        icon: Users,           permission: "managePersonal" },
  { label: "Clientes",     page: "Clients",      icon: Building2,       permission: "manageClients" },
  { label: "Pedidos",      page: "Orders",       icon: ClipboardList,   permission: "manageOrders" },
  { label: "Personal",     page: "Personal",     icon: UserCog,         permission: "managePersonal" },
  { label: "Turnos",       page: "Shifts",       icon: CalendarClock,   permission: "manageShifts" },
  { label: "Mi horario",   page: "MiHorario",    icon: User,            permission: null },
  { label: "Chat",         page: "Chat",          icon: MessageSquare,   permission: null },
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

function LayoutInner({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <style>{`
        :root { --brand: #6366f1; --brand-dark: #4f46e5; }
      `}</style>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:flex
      `}>
        <SidebarContent currentPageName={currentPageName} onClose={() => setSidebarOpen(false)} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-16 bg-white border-b flex items-center px-4 gap-4">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900">EventOps</span>
          <div className="ml-auto"><NotificationBell /></div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
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