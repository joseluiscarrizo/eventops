import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UserMinus, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  pending:  { label: "Pendiente",  icon: Clock,         cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Aprobada",   icon: CheckCircle2,  cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rechazada",  icon: XCircle,       cls: "bg-red-100 text-red-700" },
};

const TYPE_LABELS = {
  vacaciones:  "Vacaciones",
  baja_medica: "Baja médica",
  permiso:     "Permiso",
  otros:       "Otros",
};

export default function AbsencesSummary({ absences, loading }) {
  const recent = absences
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const pending = absences.filter(a => a.status === "pending").length;
  const approved = absences.filter(a => a.status === "approved").length;

  return (
    <div className="bg-white rounded-xl border">
      <div className="flex items-center justify-between p-5 border-b">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-rose-500" /> Ausencias
        </h2>
        <div className="flex items-center gap-3">
          {pending > 0 && (
            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending} pendientes</span>
          )}
          <Link to={createPageUrl("Personal")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            Ver <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="divide-y">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-100 rounded w-1/3" /></div>
            </div>
          ))
        ) : recent.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Sin ausencias registradas</div>
        ) : (
          recent.map(absence => {
            const s = STATUS_CONFIG[absence.status] || STATUS_CONFIG.pending;
            const Icon = s.icon;
            return (
              <div key={absence.id} className="flex items-center gap-3 p-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{absence.personal_name || "—"}</div>
                  <div className="text-xs text-gray-500">
                    {TYPE_LABELS[absence.type] || absence.type} · {absence.date_start ? format(new Date(absence.date_start), "d MMM", { locale: es }) : "—"} – {absence.date_end ? format(new Date(absence.date_end), "d MMM", { locale: es }) : "—"}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}