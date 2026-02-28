import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

export default function AvailabilitySettings({ settings = {}, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...settings,
      [field]: value ? parseInt(value) : null
    });
  };

  return (
    <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-800">Configuración global de disponibilidad</p>
          <p className="text-xs text-amber-700 mt-1">Estos valores se aplican por defecto a todos los horarios (se pueden sobrescribir por slot)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Descanso entre citas (min)
          </label>
          <Input
            type="number"
            min="0"
            step="5"
            placeholder="15"
            className="h-8 text-xs"
            value={settings.buffer_minutes ?? ""}
            onChange={e => handleChange("buffer_minutes", e.target.value)}
          />
          <p className="text-[11px] text-gray-500 mt-1">Minutos entre citas</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Máx. citas/día
          </label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            className="h-8 text-xs"
            value={settings.max_appointments_per_day ?? ""}
            onChange={e => handleChange("max_appointments_per_day", e.target.value)}
          />
          <p className="text-[11px] text-gray-500 mt-1">Por defecto</p>
        </div>
      </div>
    </div>
  );
}