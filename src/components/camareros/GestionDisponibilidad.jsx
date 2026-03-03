import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoColors = {
  disponible: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  ocupado: 'bg-amber-100 text-amber-700 border-amber-300',
  no_disponible: 'bg-red-100 text-red-700 border-red-300'
};

const tipoDispColors = {
  disponible: 'bg-emerald-500',
  no_disponible: 'bg-red-400',
  festivo: 'bg-purple-400',
  vacaciones: 'bg-blue-400',
  baja: 'bg-orange-400',
  parcial: 'bg-yellow-400',
  preferencia: 'bg-teal-400',
};

const tipoDispLabels = {
  disponible: 'Disponible',
  no_disponible: 'No Disponible',
  festivo: 'Festivo',
  vacaciones: 'Vacaciones',
  baja: 'Baja',
  parcial: 'Parcial',
  preferencia: 'Preferencia',
};

function CalendarioSemana({ camarero }) {
  const [semanaInicio, setSemanaInicio] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showForm, setShowForm] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [tipoDisp, setTipoDisp] = useState('no_disponible');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i));

  const { data: disponibilidades = [] } = useQuery({
    queryKey: ['disponibilidad', camarero.id],
    queryFn: () => base44.entities.Disponibilidad.filter({ camarero_id: camarero.id }, 'fecha', 60),
    enabled: !!camarero.id
  });

  const crearMutation = useMutation({
    mutationFn: (data) => base44.entities.Disponibilidad.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad', camarero.id] });
      toast.success('Disponibilidad registrada');
      setShowForm(false);
      setMotivo('');
      setHoraInicio('');
      setHoraFin('');
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.Disponibilidad.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad', camarero.id] });
      toast.success('Registro eliminado');
    }
  });

  const getDispDia = (fecha) => disponibilidades.filter(d => {
    try { return isSameDay(parseISO(d.fecha), fecha); } catch { return false; }
  });

  const handleDiaClick = (fecha) => {
    setFechaSeleccionada(fecha);
    setShowForm(true);
  };

  const handleGuardar = () => {
    if (!fechaSeleccionada) return;
    crearMutation.mutate({
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
      tipo: tipoDisp,
      hora_inicio: horaInicio || undefined,
      hora_fin: horaFin || undefined,
      motivo: motivo || undefined,
    });
  };

  return (
    <div className="space-y-3">
      {/* Navegación semana */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setSemanaInicio(d => addDays(d, -7))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-slate-700">
          {format(semanaInicio, 'd MMM', { locale: es })} – {format(addDays(semanaInicio, 6), 'd MMM yyyy', { locale: es })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setSemanaInicio(d => addDays(d, 7))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid semana */}
      <div className="grid grid-cols-7 gap-1">
        {diasSemana.map(dia => {
          const disps = getDispDia(dia);
          const esHoy = isSameDay(dia, new Date());
          return (
            <div
              key={dia.toISOString()}
              className={`border rounded-lg p-1.5 min-h-[70px] cursor-pointer hover:bg-slate-50 transition-colors ${esHoy ? 'border-[#1e3a5f] bg-blue-50/30' : 'border-slate-200'}`}
              onClick={() => handleDiaClick(dia)}
            >
              <div className={`text-center text-xs font-medium mb-1 ${esHoy ? 'text-[#1e3a5f]' : 'text-slate-500'}`}>
                <div>{format(dia, 'EEE', { locale: es })}</div>
                <div className={`text-sm font-bold ${esHoy ? 'text-[#1e3a5f]' : 'text-slate-700'}`}>{format(dia, 'd')}</div>
              </div>
              <div className="space-y-0.5">
                {disps.map(d => (
                  <div
                    key={d.id}
                    className={`text-white text-[9px] px-1 py-0.5 rounded truncate flex items-center justify-between gap-0.5 ${tipoDispColors[d.tipo] || 'bg-slate-400'}`}
                    onClick={(e) => { e.stopPropagation(); }}
                    title={tipoDispLabels[d.tipo] + (d.hora_inicio ? ` ${d.hora_inicio}-${d.hora_fin}` : '') + (d.motivo ? `: ${d.motivo}` : '')}
                  >
                    <span className="truncate">{tipoDispLabels[d.tipo]?.slice(0, 3)}</span>
                    <button
                      className="hover:opacity-70 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); eliminarMutation.mutate(d.id); }}
                    >×</button>
                  </div>
                ))}
                {disps.length === 0 && (
                  <div className="text-center">
                    <Plus className="w-3 h-3 text-slate-300 mx-auto" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(tipoDispLabels).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-xs text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-sm ${tipoDispColors[k]}`} />
            {v}
          </span>
        ))}
      </div>

      {/* Modal añadir disponibilidad */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              {fechaSeleccionada && format(fechaSeleccionada, "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Tipo</Label>
              <Select value={tipoDisp} onValueChange={setTipoDisp}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoDispLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tipoDisp === 'parcial' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Hora inicio</Label>
                  <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Hora fin</Label>
                  <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Cita médica, viaje..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleGuardar} disabled={crearMutation.isPending} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EstadoRapido({ camareros, queryClient }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.Camarero.update(id, { estado_actual: estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Estado actualizado');
    }
  });

  const filtrados = camareros.filter(c => {
    const mb = c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || c.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    const me = filtroEstado === 'todos' || c.estado_actual === filtroEstado;
    return mb && me;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="disponible">Disponibles</SelectItem>
            <SelectItem value="ocupado">Ocupados</SelectItem>
            <SelectItem value="no_disponible">No Disponibles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['disponible', 'Disponibles', 'emerald'], ['ocupado', 'Ocupados', 'amber'], ['no_disponible', 'No Disp.', 'red']].map(([k, label, color]) => (
          <div key={k} className={`p-3 rounded-lg bg-${color}-50`}>
            <p className={`text-xs text-${color}-600`}>{label}</p>
            <p className={`text-xl font-bold text-${color}-700`}>{camareros.filter(c => c.estado_actual === k).length}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {filtrados.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
            <div>
              <p className="font-medium text-sm text-slate-800">{c.nombre}</p>
              <p className="text-xs text-slate-500 font-mono">#{c.codigo}</p>
            </div>
            <div className="flex gap-1">
              {['disponible', 'ocupado', 'no_disponible'].map(estado => (
                <Button
                  key={estado}
                  size="sm"
                  variant={c.estado_actual === estado ? 'default' : 'outline'}
                  onClick={() => updateEstadoMutation.mutate({ id: c.id, estado })}
                  disabled={c.estado_actual === estado}
                  className={
                    c.estado_actual === estado
                      ? estado === 'disponible' ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs'
                        : estado === 'ocupado' ? 'bg-amber-600 hover:bg-amber-700 text-white h-7 px-2 text-xs'
                        : 'bg-red-600 hover:bg-red-700 text-white h-7 px-2 text-xs'
                      : 'h-7 px-2 text-xs'
                  }
                >
                  {estado === 'disponible' ? '✓' : estado === 'ocupado' ? '⏳' : '✗'}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GestionDisponibilidad({ open, onClose }) {
  const [camareroSeleccionado, setCamareroSeleccionado] = useState(null);
  const queryClient = useQueryClient();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1e3a5f]" />
            Gestión de Disponibilidad
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="estado">
          <TabsList className="w-full">
            <TabsTrigger value="estado" className="flex-1">Estado Rápido</TabsTrigger>
            <TabsTrigger value="calendario" className="flex-1">Calendario por Camarero</TabsTrigger>
          </TabsList>

          <TabsContent value="estado" className="mt-4">
            <EstadoRapido camareros={camareros} queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="calendario" className="mt-4 space-y-4">
            {!camareroSeleccionado ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Selecciona un camarero para ver y editar su calendario:</p>
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {camareros.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCamareroSeleccionado(c)}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg text-left hover:border-[#1e3a5f] hover:bg-blue-50/30 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        c.estado_actual === 'disponible' ? 'bg-emerald-500' :
                        c.estado_actual === 'ocupado' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.nombre}</p>
                        <p className="text-xs text-slate-500">#{c.codigo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCamareroSeleccionado(null)}>
                      ← Volver
                    </Button>
                    <h3 className="font-semibold text-slate-800">{camareroSeleccionado.nombre}</h3>
                    <Badge className={estadoColors[camareroSeleccionado.estado_actual || 'disponible'] || ''}>
                      {camareroSeleccionado.estado_actual || 'disponible'}
                    </Badge>
                  </div>
                </div>
                <CalendarioSemana camarero={camareroSeleccionado} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}