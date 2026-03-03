import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function DuplicarEvento({ open, onOpenChange, pedidoOriginal }) {
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [duplicarAsignaciones, setDuplicarAsignaciones] = useState(true);
  const queryClient = useQueryClient();

  const duplicarMutation = useMutation({
    mutationFn: async () => {
      // Generar nuevo código
      const pedidos = await base44.entities.Pedido.list('codigo_pedido', 500);
      const maxCodigo = pedidos.reduce((max, p) => {
        if (p.codigo_pedido && p.codigo_pedido.startsWith('P')) {
          const num = parseInt(p.codigo_pedido.substring(1));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      const nuevoCodigo = `P${String(maxCodigo + 1).padStart(3, '0')}`;

      // Crear nuevo pedido con los mismos datos
      const nuevoPedido = {
        ...pedidoOriginal,
        codigo_pedido: nuevoCodigo,
        dia: nuevaFecha,
        estado_evento: 'planificado',
        evento_padre_id: pedidoOriginal.id
      };

      // Eliminar campos que no deben duplicarse
      delete nuevoPedido.id;
      delete nuevoPedido.created_date;
      delete nuevoPedido.updated_date;
      delete nuevoPedido.created_by;

      const pedidoCreado = await base44.entities.Pedido.create(nuevoPedido);

      // Duplicar asignaciones si está activado
      if (duplicarAsignaciones) {
        const asignaciones = await base44.entities.AsignacionCamarero.filter({
          pedido_id: pedidoOriginal.id
        });

        for (const asig of asignaciones) {
          await base44.entities.AsignacionCamarero.create({
            pedido_id: pedidoCreado.id,
            camarero_id: asig.camarero_id,
            camarero_nombre: asig.camarero_nombre,
            camarero_codigo: asig.camarero_codigo,
            estado: 'pendiente',
            fecha_pedido: nuevaFecha,
            hora_entrada: asig.hora_entrada,
            hora_salida: asig.hora_salida,
            turno_index: asig.turno_index,
            posicion_slot: asig.posicion_slot
          });
        }
      }

      return pedidoCreado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Evento duplicado exitosamente');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al duplicar evento: ' + error.message);
    }
  });

  const handleDuplicar = () => {
    if (!nuevaFecha) {
      toast.error('Selecciona una fecha para el nuevo evento');
      return;
    }
    duplicarMutation.mutate();
  };

  React.useEffect(() => {
    if (open && pedidoOriginal) {
      // Sugerir la fecha del día siguiente
      const fechaSugerida = format(addDays(new Date(pedidoOriginal.dia), 7), 'yyyy-MM-dd');
      setNuevaFecha(fechaSugerida);
    }
  }, [open, pedidoOriginal]);

  if (!pedidoOriginal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-[#1e3a5f]" />
            Duplicar Evento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">Evento original:</p>
            <p className="font-semibold text-slate-800">{pedidoOriginal.cliente}</p>
            <p className="text-xs text-slate-500">
              {pedidoOriginal.lugar_evento} • {pedidoOriginal.dia}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nueva_fecha">Nueva Fecha *</Label>
            <Input
              id="nueva_fecha"
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Switch
              id="duplicar_asignaciones"
              checked={duplicarAsignaciones}
              onCheckedChange={setDuplicarAsignaciones}
            />
            <div className="flex-1">
              <Label htmlFor="duplicar_asignaciones" className="cursor-pointer font-medium">
                Copiar asignaciones de camareros
              </Label>
              <p className="text-xs text-slate-500">
                Los camareros serán asignados automáticamente con estado "Pendiente"
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Se creará un nuevo evento con la misma configuración: turnos, requisitos, ubicación, etc.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDuplicar}
              disabled={duplicarMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              <Copy className="w-4 h-4 mr-2" />
              {duplicarMutation.isPending ? 'Duplicando...' : 'Duplicar Evento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}