import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";

export default function SlotConstraints({ buffer = null, maxAppointments = null, onChange }) {
  return (
    <div className="space-y-2 p-3 border border-purple-200 rounded-lg bg-purple-50">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-xs font-medium text-purple-800">Límites de este horario</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-0.5 block">
            Descanso (min)
          </label>
          <Input
            type="number"
            min="0"
            step="5"
            className="h-7 text-xs"
            placeholder="—"
            value={buffer ?? ""}
            onChange={e => onChange({ buffer: e.target.value ? parseInt(e.target.value) : null, maxAppointments })}
          />
          <p className="text-[10px] text-gray-500 mt-0.5">Sobrescribe global</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-0.5 block">
            Máx. citas
          </label>
          <Input
            type="number"
            min="1"
            className="h-7 text-xs"
            placeholder="—"
            value={maxAppointments ?? ""}
            onChange={e => onChange({ buffer, maxAppointments: e.target.value ? parseInt(e.target.value) : null })}
          />
          <p className="text-[10px] text-gray-500 mt-0.5">Sobrescribe global</p>
        </div>
      </div>
    </div>
  );
}