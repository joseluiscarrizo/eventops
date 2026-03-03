import { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, ChevronDown, ChevronUp, Star, Award, Clock } from 'lucide-react';

const ESPECIALIDADES = [
  { value: 'general', label: 'General' },
  { value: 'cocteleria', label: 'Coctelería' },
  { value: 'banquetes', label: 'Banquetes' },
  { value: 'eventos_vip', label: 'Eventos VIP' },
  { value: 'buffet', label: 'Buffet' },
];

const NIVELES = [
  { value: 'junior', label: 'Junior' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'senior', label: 'Senior' },
  { value: 'experto', label: 'Experto' },
];

const TURNOS_HORARIOS = [
  { value: 'manana', label: '🌅 Mañana (6h-14h)', desde: 6, hasta: 14 },
  { value: 'tarde', label: '☀️ Tarde (14h-20h)', desde: 14, hasta: 20 },
  { value: 'noche', label: '🌙 Noche (20h-24h)', desde: 20, hasta: 24 },
];

export default function FiltrosAvanzadosCamareros({
  filtros,
  onFiltrosChange,
  camareros = [],
  pedido = null,
}) {
  const [expandido, setExpandido] = useState(false);

  // Recopilar todas las habilidades disponibles de los camareros
  const todasHabilidades = useMemo(() => {
    const set = new Set();
    camareros.forEach(c => (c.habilidades || []).forEach(h => set.add(h)));
    return Array.from(set).sort();
  }, [camareros]);

  const countFiltrosActivos = [
    filtros.busqueda,
    filtros.especialidad,
    filtros.nivel,
    filtros.turnoHorario,
    filtros.habilidad,
    filtros.soloDisponibles,
    filtros.valoracionMin > 0,
  ].filter(Boolean).length;

  const limpiarTodo = () => {
    onFiltrosChange({
      busqueda: '',
      especialidad: '',
      nivel: '',
      turnoHorario: '',
      habilidad: '',
      soloDisponibles: true,
      valoracionMin: 0,
    });
  };

  const set = (key, value) => onFiltrosChange({ ...filtros, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Barra superior siempre visible */}
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={filtros.busqueda}
            onChange={e => set('busqueda', e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="pl-9 h-9 text-sm"
          />
          {filtros.busqueda && (
            <button
              onClick={() => set('busqueda', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpandido(v => !v)}
          className={`flex items-center gap-1.5 text-xs h-9 ${expandido ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : ''}`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {countFiltrosActivos > 0 && (
            <span className={`rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold ${expandido ? 'bg-white text-[#1e3a5f]' : 'bg-[#1e3a5f] text-white'}`}>
              {countFiltrosActivos}
            </span>
          )}
          {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>

        {countFiltrosActivos > 0 && (
          <Button variant="ghost" size="sm" onClick={limpiarTodo} className="text-xs h-9 text-slate-500 hover:text-red-500">
            <X className="w-3.5 h-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Panel expandido */}
      {expandido && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Especialidad */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Especialidad</label>
              <Select value={filtros.especialidad || ''} onValueChange={v => set('especialidad', v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {ESPECIALIDADES.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nivel */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Nivel experiencia</label>
              <Select value={filtros.nivel || ''} onValueChange={v => set('nivel', v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {NIVELES.map(n => (
                    <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Habilidad */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Habilidad</label>
              <Select value={filtros.habilidad || ''} onValueChange={v => set('habilidad', v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {todasHabilidades.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turno horario */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Disponibilidad horaria
              </label>
              <Select value={filtros.turnoHorario || ''} onValueChange={v => set('turnoHorario', v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Cualquier turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Cualquier turno</SelectItem>
                  {TURNOS_HORARIOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valoración mínima */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" /> Valoración mínima
              </label>
              <div className="flex gap-1">
                {[0, 3, 3.5, 4, 4.5].map(v => (
                  <button
                    key={v}
                    onClick={() => set('valoracionMin', v)}
                    className={`flex-1 h-8 rounded text-xs font-medium border transition-all ${
                      filtros.valoracionMin === v
                        ? 'bg-amber-400 text-white border-amber-400'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {v === 0 ? 'Todas' : `${v}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Solo disponibles */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Estado</label>
              <div className="flex gap-1">
                <button
                  onClick={() => set('soloDisponibles', true)}
                  className={`flex-1 h-8 rounded text-xs font-medium border transition-all ${
                    filtros.soloDisponibles
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  ✅ Disponibles
                </button>
                <button
                  onClick={() => set('soloDisponibles', false)}
                  className={`flex-1 h-8 rounded text-xs font-medium border transition-all ${
                    !filtros.soloDisponibles
                      ? 'bg-slate-600 text-white border-slate-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  👥 Todos
                </button>
              </div>
            </div>
          </div>

          {/* Tags de filtros activos */}
          {countFiltrosActivos > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
              <span className="text-xs text-slate-400 self-center">Activos:</span>
              {filtros.especialidad && (
                <Badge variant="outline" className="text-xs gap-1 h-5 bg-blue-50 text-blue-700 border-blue-200">
                  {ESPECIALIDADES.find(e => e.value === filtros.especialidad)?.label}
                  <button onClick={() => set('especialidad', '')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {filtros.nivel && (
                <Badge variant="outline" className="text-xs gap-1 h-5 bg-violet-50 text-violet-700 border-violet-200">
                  {NIVELES.find(n => n.value === filtros.nivel)?.label}
                  <button onClick={() => set('nivel', '')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {filtros.habilidad && (
                <Badge variant="outline" className="text-xs gap-1 h-5 bg-amber-50 text-amber-700 border-amber-200">
                  <Award className="w-2.5 h-2.5" />{filtros.habilidad}
                  <button onClick={() => set('habilidad', '')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {filtros.turnoHorario && (
                <Badge variant="outline" className="text-xs gap-1 h-5 bg-teal-50 text-teal-700 border-teal-200">
                  <Clock className="w-2.5 h-2.5" />{TURNOS_HORARIOS.find(t => t.value === filtros.turnoHorario)?.label?.split(' ')[1]}
                  <button onClick={() => set('turnoHorario', '')}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {filtros.valoracionMin > 0 && (
                <Badge variant="outline" className="text-xs gap-1 h-5 bg-amber-50 text-amber-700 border-amber-200">
                  ★ ≥{filtros.valoracionMin}
                  <button onClick={() => set('valoracionMin', 0)}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper exportado para aplicar filtros a lista de camareros
export function aplicarFiltrosCamareros(camareros, filtros, asignaciones = [], pedido = null) {
  const TURNOS_HORARIOS_MAP = {
    manana: { desde: 6, hasta: 14 },
    tarde:  { desde: 14, hasta: 20 },
    noche:  { desde: 20, hasta: 24 },
  };

  return camareros.filter(c => {
    // Búsqueda texto
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (!c.nombre?.toLowerCase().includes(q) && !c.codigo?.toLowerCase().includes(q)) return false;
    }

    // Disponible
    if (filtros.soloDisponibles && !c.disponible) return false;

    // Especialidad
    if (filtros.especialidad && c.especialidad !== filtros.especialidad) return false;

    // Nivel
    if (filtros.nivel && c.nivel_experiencia !== filtros.nivel) return false;

    // Habilidad
    if (filtros.habilidad && !c.habilidades?.includes(filtros.habilidad)) return false;

    // Valoración mínima
    if (filtros.valoracionMin > 0) {
      if (!c.valoracion_promedio || c.valoracion_promedio < filtros.valoracionMin) return false;
    }

    // Turno horario (basado en preferencias_horarias del camarero)
    if (filtros.turnoHorario) {
      const turno = TURNOS_HORARIOS_MAP[filtros.turnoHorario];
      const prefs = c.preferencias_horarias;
      if (prefs?.turnos_preferidos?.length > 0) {
        // Mapear turnos preferidos a horarios
        const turnoMap = { mañana: 'manana', tarde: 'tarde', noche: 'noche', madrugada: 'noche' };
        const tienePreferencia = prefs.turnos_preferidos.some(t => turnoMap[t] === filtros.turnoHorario);
        if (!tienePreferencia) return false;
      } else if (prefs?.hora_inicio_preferida) {
        const horaInicio = parseInt(prefs.hora_inicio_preferida);
        if (horaInicio < turno.desde || horaInicio >= turno.hasta) return false;
      }
      // Si no tiene preferencias definidas, lo incluimos
    }

    return true;
  });
}