import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Settings } from 'lucide-react';
import { toast } from 'sonner';

const diasSemana = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' }
];

const turnosPosibles = [
  { value: 'mañana', label: 'Mañana', sub: '6:00 - 14:00' },
  { value: 'tarde', label: 'Tarde', sub: '14:00 - 22:00' },
  { value: 'noche', label: 'Noche', sub: '22:00 - 6:00' },
  { value: 'madrugada', label: 'Madrugada', sub: '0:00 - 8:00' }
];

const tiposEvento = [
  { value: 'banquetes', label: 'Banquetes' },
  { value: 'eventos_vip', label: 'Eventos VIP' },
  { value: 'cocteleria', label: 'Coctelería' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'bodas', label: 'Bodas' },
  { value: 'corporativos', label: 'Corporativos' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'privados', label: 'Privados' },
];

export default function PreferenciasHorarias({ open, onClose, camarero }) {
  const prefs = camarero?.preferencias_horarias || {};

  const [horaInicio, setHoraInicio] = useState(prefs.hora_inicio_preferida || '');
  const [horaFin, setHoraFin] = useState(prefs.hora_fin_preferida || '');
  const [turnosSeleccionados, setTurnosSeleccionados] = useState(prefs.turnos_preferidos || []);
  const [diasSeleccionados, setDiasSeleccionados] = useState(prefs.dias_preferidos || []);
  const [tiposPreferidos, setTiposPreferidos] = useState(camarero?.tipos_evento_preferidos || []);
  const [zonaHoraria, setZonaHoraria] = useState(camarero?.zona_horaria || 'Europe/Madrid');

  const queryClient = useQueryClient();

  const guardarMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Camarero.update(camarero.id, {
        preferencias_horarias: {
          hora_inicio_preferida: horaInicio,
          hora_fin_preferida: horaFin,
          turnos_preferidos: turnosSeleccionados,
          dias_preferidos: diasSeleccionados
        },
        zona_horaria: zonaHoraria,
        tipos_evento_preferidos: tiposPreferidos
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Preferencias guardadas correctamente');
      onClose();
    }
  });

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1e3a5f]" />
            Preferencias - {camarero?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            💡 Estas preferencias ayudan a optimizar las asignaciones automáticas
          </div>

          {/* Horario Preferido */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" /> Horario de Trabajo Preferido
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Hora Inicio</Label>
                <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Hora Fin</Label>
                <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Turnos Preferidos */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Franjas Horarias Preferidas</Label>
            <div className="grid grid-cols-2 gap-2">
              {turnosPosibles.map(turno => (
                <button
                  key={turno.value}
                  type="button"
                  onClick={() => toggle(turnosSeleccionados, setTurnosSeleccionados, turno.value)}
                  className={`flex flex-col p-3 rounded-lg border-2 text-left transition-colors ${
                    turnosSeleccionados.includes(turno.value)
                      ? 'border-[#1e3a5f] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium text-sm">{turno.label}</span>
                  <span className="text-xs text-slate-500">{turno.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Días Preferidos */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Días de la Semana Preferidos</Label>
            <div className="flex gap-1.5 flex-wrap">
              {diasSemana.map(dia => (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggle(diasSeleccionados, setDiasSeleccionados, dia.value)}
                  className={`w-11 h-11 rounded-full text-sm font-medium transition-colors ${
                    diasSeleccionados.includes(dia.value)
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipos de evento */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tipos de Evento Preferidos</Label>
            <div className="flex flex-wrap gap-2">
              {tiposEvento.map(tipo => (
                <Badge
                  key={tipo.value}
                  variant={tiposPreferidos.includes(tipo.value) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    tiposPreferidos.includes(tipo.value)
                      ? 'bg-[#1e3a5f] hover:bg-[#152a45] text-white'
                      : 'hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
                  }`}
                  onClick={() => toggle(tiposPreferidos, setTiposPreferidos, tipo.value)}
                >
                  {tipo.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => guardarMutation.mutate()}
              disabled={guardarMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              Guardar Preferencias
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}