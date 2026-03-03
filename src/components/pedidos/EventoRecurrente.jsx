import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Repeat, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, addWeeks, addMonths, eachDayOfInterval } from 'date-fns';

const diasSemana = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

export default function EventoRecurrente({ open, onOpenChange, pedidoBase }) {
  const [frecuencia, setFrecuencia] = useState('semanal');
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [fechaFin, setFechaFin] = useState('');
  const [previsualizacion, setPrevisualizacion] = useState([]);
  const queryClient = useQueryClient();

  const generarFechas = () => {
    if (!pedidoBase || !fechaFin) return [];
    
    const fechaInicio = new Date(pedidoBase.dia);
    const fechaFinDate = new Date(fechaFin);
    const fechas = [];

    if (frecuencia === 'semanal') {
      let fecha = new Date(fechaInicio);
      while (fecha <= fechaFinDate) {
        fechas.push(format(fecha, 'yyyy-MM-dd'));
        fecha = addWeeks(fecha, 1);
      }
    } else if (frecuencia === 'quincenal') {
      let fecha = new Date(fechaInicio);
      while (fecha <= fechaFinDate) {
        fechas.push(format(fecha, 'yyyy-MM-dd'));
        fecha = addWeeks(fecha, 2);
      }
    } else if (frecuencia === 'mensual') {
      let fecha = new Date(fechaInicio);
      while (fecha <= fechaFinDate) {
        fechas.push(format(fecha, 'yyyy-MM-dd'));
        fecha = addMonths(fecha, 1);
      }
    } else if (frecuencia === 'personalizado' && diasSeleccionados.length > 0) {
      const todasFechas = eachDayOfInterval({ start: fechaInicio, end: fechaFinDate });
      todasFechas.forEach(fecha => {
        if (diasSeleccionados.includes(fecha.getDay())) {
          fechas.push(format(fecha, 'yyyy-MM-dd'));
        }
      });
    }

    return fechas;
  };

  React.useEffect(() => {
    const fechas = generarFechas();
    setPrevisualizacion(fechas);
  }, [frecuencia, diasSeleccionados, fechaFin, pedidoBase]);

  const crearRecurrenteMutation = useMutation({
    mutationFn: async () => {
      const fechas = generarFechas();
      const pedidosCreados = [];

      for (const fecha of fechas) {
        // Generar nuevo código para cada pedido
        const pedidos = await base44.entities.Pedido.list('codigo_pedigo', 500);
        const maxCodigo = pedidos.reduce((max, p) => {
          if (p.codigo_pedido && p.codigo_pedido.startsWith('P')) {
            const num = parseInt(p.codigo_pedido.substring(1));
            return Math.max(max, isNaN(num) ? 0 : num);
          }
          return max;
        }, pedidosCreados.length);
        const nuevoCodigo = `P${String(maxCodigo + 1).padStart(3, '0')}`;

        const nuevoPedido = {
          ...pedidoBase,
          codigo_pedido: nuevoCodigo,
          dia: fecha,
          estado_evento: 'planificado',
          es_recurrente: true,
          frecuencia_recurrencia: frecuencia,
          dias_semana_recurrencia: diasSeleccionados,
          fecha_fin_recurrencia: fechaFin,
          evento_padre_id: pedidoBase.id
        };

        delete nuevoPedido.id;
        delete nuevoPedido.created_date;
        delete nuevoPedido.updated_date;
        delete nuevoPedido.created_by;

        const pedidoCreado = await base44.entities.Pedido.create(nuevoPedido);
        pedidosCreados.push(pedidoCreado);
      }

      return pedidosCreados;
    },
    onSuccess: (pedidos) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success(`${pedidos.length} eventos recurrentes creados`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al crear eventos: ' + error.message);
    }
  });

  const handleCrear = () => {
    if (!fechaFin) {
      toast.error('Selecciona una fecha de finalización');
      return;
    }
    if (frecuencia === 'personalizado' && diasSeleccionados.length === 0) {
      toast.error('Selecciona al menos un día de la semana');
      return;
    }
    crearRecurrenteMutation.mutate();
  };

  const toggleDia = (dia) => {
    setDiasSeleccionados(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia)
        : [...prev, dia]
    );
  };

  if (!pedidoBase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[#1e3a5f]" />
            Crear Evento Recurrente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">Evento base:</p>
            <p className="font-semibold text-slate-800">{pedidoBase.cliente}</p>
            <p className="text-xs text-slate-500">
              {pedidoBase.lugar_evento} • {pedidoBase.dia}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Frecuencia de Repetición</Label>
            <Select value={frecuencia} onValueChange={setFrecuencia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal (cada 7 días)</SelectItem>
                <SelectItem value="quincenal">Quincenal (cada 14 días)</SelectItem>
                <SelectItem value="mensual">Mensual (mismo día cada mes)</SelectItem>
                <SelectItem value="personalizado">Personalizado (días específicos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frecuencia === 'personalizado' && (
            <div className="space-y-2">
              <Label>Días de la Semana</Label>
              <div className="grid grid-cols-2 gap-2">
                {diasSemana.map(dia => (
                  <div key={dia.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`dia-${dia.value}`}
                      checked={diasSeleccionados.includes(dia.value)}
                      onCheckedChange={() => toggleDia(dia.value)}
                    />
                    <Label htmlFor={`dia-${dia.value}`} className="cursor-pointer">
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fecha_fin">Repetir Hasta</Label>
            <Input
              id="fecha_fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={pedidoBase.dia}
              required
            />
          </div>

          {previsualizacion.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <Label className="text-sm font-semibold mb-2 block">
                Previsualización ({previsualizacion.length} eventos)
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {previsualizacion.slice(0, 10).map((fecha, idx) => (
                  <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(fecha), "dd 'de' MMMM yyyy", { locale: require('date-fns/locale/es') })}
                  </div>
                ))}
                {previsualizacion.length > 10 && (
                  <p className="text-xs text-slate-500 italic">
                    ... y {previsualizacion.length - 10} fechas más
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ℹ️ Se crearán múltiples eventos independientes. Cada uno podrá ser editado o cancelado por separado.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrear}
              disabled={crearRecurrenteMutation.isPending || previsualizacion.length === 0}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              <Repeat className="w-4 h-4 mr-2" />
              {crearRecurrenteMutation.isPending ? 'Creando...' : `Crear ${previsualizacion.length} Eventos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}