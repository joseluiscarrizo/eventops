import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

const RECURRING_PATTERNS = {
  simple: [
    { value: "weekly", label: "Cada semana (mismo día)" },
    { value: "bi_weekly", label: "Cada 2 semanas" },
    { value: "monthly", label: "Cada mes (misma fecha)" }
  ],
  advanced: [
    { value: "first_monday", label: "Primer lunes del mes" },
    { value: "first_friday", label: "Primer viernes del mes" },
    { value: "last_monday", label: "Último lunes del mes" },
    { value: "last_friday", label: "Último viernes del mes" }
  ]
};

export default function RecurringPatternSelector({ value, dateStart, onChange }) {
  const handlePatternChange = (pattern) => {
    onChange(pattern);
  };

  const handleUntilChange = (until) => {
    // Update via parent
    onChange({ ...value, recurring_until: until });
  };

  return (
    <div className="space-y-3 p-3 border border-indigo-200 rounded-lg bg-indigo-50">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
        <span className="text-xs font-medium text-indigo-800">Patrón de recurrencia</span>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Tipo de repetición</label>
        <div className="space-y-2">
          {/* Simple patterns */}
          <div>
            <p className="text-[11px] text-gray-500 mb-1.5 font-medium uppercase">Patrones simples</p>
            <div className="grid grid-cols-1 gap-1">
              {RECURRING_PATTERNS.simple.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePatternChange(p.value)}
                  className={`text-xs px-3 py-1.5 rounded border text-left transition-colors ${
                    value === p.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced patterns */}
          <div>
            <p className="text-[11px] text-gray-500 mb-1.5 font-medium uppercase">Patrones avanzados</p>
            <div className="grid grid-cols-1 gap-1">
              {RECURRING_PATTERNS.advanced.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePatternChange(p.value)}
                  className={`text-xs px-3 py-1.5 rounded border text-left transition-colors ${
                    value === p.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Válido hasta</label>
        <Input
          type="date"
          className="h-8 text-xs"
          min={dateStart}
          placeholder="Fecha de fin (opcional)"
          onChange={e => handleUntilChange(e.target.value)}
        />
        <p className="text-[11px] text-gray-500 mt-1">Déjalo en blanco para sin límite de fecha</p>
      </div>
    </div>
  );
}