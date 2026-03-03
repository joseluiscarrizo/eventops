import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, MapPin, Star, Briefcase, Users } from 'lucide-react';

const nivelConfig = {
  excelente: { bg: 'bg-emerald-500', text: 'text-white', label: 'Excelente', ring: 'ring-emerald-300' },
  bueno:     { bg: 'bg-blue-500',    text: 'text-white', label: 'Bueno',     ring: 'ring-blue-300' },
  aceptable: { bg: 'bg-amber-400',   text: 'text-white', label: 'Aceptable', ring: 'ring-amber-300' },
  bajo:      { bg: 'bg-slate-400',   text: 'text-white', label: 'Bajo',      ring: 'ring-slate-300' },
};

export default function ScoreBadge({ scoreData }) {
  if (!scoreData) return null;

  const { score, nivel, breakdown } = scoreData;
  const cfg = nivelConfig[nivel] || nivelConfig.bajo;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs cursor-help ${cfg.bg} ${cfg.text} ring-2 ${cfg.ring}`}>
            <TrendingUp className="w-3 h-3" />
            {score}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-52 p-3 text-xs space-y-2">
          <p className="font-semibold text-sm border-b pb-1 mb-2">Score de idoneidad: {score}/100</p>
          <div className="space-y-1.5">
            <ScoreRow icon={<Star className="w-3 h-3 text-amber-400" />} label="Especialidad / habilidades" value={breakdown?.match} max={30} />
            <ScoreRow icon={<Star className="w-3 h-3 text-yellow-500" />} label="Valoración" value={breakdown?.valoracion} max={25} />
            <ScoreRow icon={<Briefcase className="w-3 h-3 text-blue-500" />} label="Carga de trabajo" value={breakdown?.carga} max={20} />
            <ScoreRow icon={<MapPin className="w-3 h-3 text-red-400" />} label="Proximidad" value={breakdown?.geo} max={15} />
            <ScoreRow icon={<Users className="w-3 h-3 text-violet-500" />} label="Historial" value={breakdown?.historial} max={10} />
          </div>
          {breakdown?.distanciaKm != null && (
            <p className="text-slate-400 border-t pt-1">📍 Distancia: {breakdown.distanciaKm} km</p>
          )}
          {breakdown?.eventosMes != null && (
            <p className="text-slate-400">📅 Eventos este mes: {breakdown.eventosMes}</p>
          )}
          {breakdown?.horasDia > 0 && (
            <p className="text-slate-400">⏱ Horas hoy: {breakdown.horasDia}h</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScoreRow({ icon, label, value, max }) {
  const pct = value != null ? Math.round((value / max) * 100) : 0;
  const barColor = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="flex items-center gap-1 text-slate-300">{icon} {label}</span>
        <span className="font-mono text-white">{value ?? '–'}/{max}</span>
      </div>
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}