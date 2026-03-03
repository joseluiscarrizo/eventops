import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Calendar, TrendingUp, TrendingDown, ThumbsUp, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const StarDisplay = ({ value, label }) => (
  <div className="flex items-center gap-1">
    <span className="text-xs text-slate-500 w-24 shrink-0">{label}:</span>
    <div className="flex">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
    <span className="text-xs font-semibold text-slate-600 ml-1">{value?.toFixed(1) || '-'}</span>
  </div>
);

function BarMetric({ label, value, max = 5, color = 'bg-amber-400' }) {
  const pct = ((value || 0) / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-7 text-right">{value?.toFixed(1) || '-'}</span>
    </div>
  );
}

export default function ValoracionesHistorial({ camareroId }) {
  const { data: valoraciones = [], isLoading } = useQuery({
    queryKey: ['valoraciones', camareroId],
    queryFn: () => base44.entities.Valoracion.filter({ camarero_id: camareroId }, '-created_date', 50),
    enabled: !!camareroId
  });

  if (isLoading) return <div className="text-center py-4 text-slate-400">Cargando...</div>;

  if (valoraciones.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400">
        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sin valoraciones aún</p>
      </Card>
    );
  }

  const promedio = valoraciones.reduce((acc, v) => acc + v.puntuacion, 0) / valoraciones.length;

  const avg = (field) => {
    const valid = valoraciones.filter(v => v[field] > 0);
    if (!valid.length) return null;
    return valid.reduce((a, v) => a + v[field], 0) / valid.length;
  };

  const puntualidadAvg = avg('puntualidad');
  const profesionalidadAvg = avg('profesionalidad');
  const actitudAvg = avg('actitud');
  const presentacionAvg = avg('presentacion');
  const equipoAvg = avg('trabajo_equipo');

  // Tendencia: últimas 5 vs anteriores
  const ultimas5 = valoraciones.slice(0, 5);
  const anteriores = valoraciones.slice(5, 10);
  const tendencia = anteriores.length > 0
    ? (ultimas5.reduce((a, v) => a + v.puntuacion, 0) / ultimas5.length) -
      (anteriores.reduce((a, v) => a + v.puntuacion, 0) / anteriores.length)
    : null;

  const recomendanPct = Math.round(
    (valoraciones.filter(v => v.recomendaria).length / valoraciones.length) * 100
  );

  return (
    <div className="space-y-4">
      {/* Resumen general */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-amber-50 border-amber-200 col-span-1">
          <p className="text-xs text-amber-700 mb-1">Promedio General</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-amber-600">{promedio.toFixed(1)}</span>
            <span className="text-amber-400 pb-0.5">/5</span>
          </div>
          <div className="flex mt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-4 h-4 ${s <= Math.round(promedio) ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-1">{valoraciones.length} valoraciones</p>
        </Card>

        <Card className="p-3 col-span-1">
          <p className="text-xs text-slate-500 mb-1">Tendencia</p>
          {tendencia !== null ? (
            <div className={`flex items-center gap-1 ${tendencia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {tendencia >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="text-xl font-bold">{tendencia >= 0 ? '+' : ''}{tendencia.toFixed(1)}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">Pocos datos</p>
          )}
          <p className="text-xs text-slate-400 mt-1">vs 5 anteriores</p>
        </Card>

        <Card className="p-3 col-span-1">
          <p className="text-xs text-slate-500 mb-1">Recomendación</p>
          <div className="flex items-center gap-1 text-emerald-600">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-xl font-bold">{recomendanPct}%</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">lo recomiendan</p>
        </Card>
      </div>

      {/* Métricas por categoría */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Rendimiento por Categoría</p>
        <div className="space-y-2.5">
          <BarMetric label="Puntualidad" value={puntualidadAvg} color="bg-blue-400" />
          <BarMetric label="Profesionalidad" value={profesionalidadAvg} color="bg-purple-400" />
          <BarMetric label="Actitud" value={actitudAvg} color="bg-emerald-400" />
          <BarMetric label="Presentación" value={presentacionAvg} color="bg-amber-400" />
          <BarMetric label="Trabajo en equipo" value={equipoAvg} color="bg-teal-400" />
        </div>
      </Card>

      {/* Historial de eventos */}
      <p className="text-sm font-semibold text-slate-700">Historial de Eventos</p>
      <ScrollArea className="h-[280px]">
        <div className="space-y-3">
          {valoraciones.map(v => (
            <Card key={v.id} className="p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{v.cliente || 'Sin cliente'}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    {v.fecha_evento ? format(new Date(v.fecha_evento), 'dd MMM yyyy', { locale: es }) : '-'}
                    {v.coordinador && <span>· {v.coordinador}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {v.recomendaria && (
                    <CheckCircle className="w-4 h-4 text-emerald-500" title="Recomendado" />
                  )}
                  <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span className="font-bold text-amber-700 text-sm">{v.puntuacion}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                {v.puntualidad > 0 && <StarDisplay value={v.puntualidad} label="Puntualidad" />}
                {v.profesionalidad > 0 && <StarDisplay value={v.profesionalidad} label="Profesionalidad" />}
                {v.actitud > 0 && <StarDisplay value={v.actitud} label="Actitud" />}
                {v.presentacion > 0 && <StarDisplay value={v.presentacion} label="Presentación" />}
              </div>

              {v.comentario && (
                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded italic border-l-2 border-amber-300">
                  "{v.comentario}"
                </p>
              )}
              {v.areas_mejora && (
                <p className="text-xs text-orange-600 mt-1.5">
                  <strong>Mejora:</strong> {v.areas_mejora}
                </p>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}