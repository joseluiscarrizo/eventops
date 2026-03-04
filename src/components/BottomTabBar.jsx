import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Calendar, ClipboardList, UserCog, User } from "lucide-react";

const TABS = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Eventos",   page: "Events",    icon: Calendar },
  { label: "Pedidos",   page: "Orders",    icon: ClipboardList },
  { label: "Personal",  page: "Personal",  icon: UserCog },
  { label: "Mi horario",page: "MiHorario", icon: User },
];

export default function BottomTabBar({ currentPageName }) {
  const navigate = useNavigate();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ label, page, icon: Icon }) => {
        const active = currentPageName === page;
        return (
          <button
            key={page}
            onClick={() => navigate(createPageUrl(page), { replace: active })}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium select-none transition-colors ${
              active
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}