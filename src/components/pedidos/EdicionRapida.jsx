import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EdicionRapida({ pedido, open, onOpenChange, campo }) {
  const [valor, setValor] = useState('');
  const queryClient = useQueryClient();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    enabled: campo === 'camareros'
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones', pedido?.id],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ pedido_id: pedido.id }),
    enabled: campo === 'camareros' && !!pedido?.id
  });

  React.useEffect(() => {
    if (pedido && campo) {
      switch(campo) {
        case 'cliente':
          setValor(pedido.cliente || '');
          break;
        case 'fecha':
          setValor(pedido.dia ? pedido.dia.split('T')[0] : '');
          break;
        case 'lugar':
          setValor(pedido.lugar_evento || '');
          break;
        case 'link_ubicacion':
          setValor(pedido.link_ubicacion || '');
          break;
        case 'estado':
          setValor(pedido.estado_evento || 'planificado');
          break;
        default:
          setValor('');
      }
    }
  }, [pedido, campo, open]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido actualizado');
      onOpenChange(false);
    }
  });

  const asignarCamareroMutation = useMutation({
    mutationFn: async (camareroId) => {
      const camarero = camareros.find(c => c.id === camareroId);
      
      // Verificar si ya está asignado
      const yaAsignado = asignaciones.some(a => a.camarero_id === camareroId);
      if (yaAsignado) {
        throw new Error('Este camarero ya está asignado a este pedido');
      }

      // Crear asignación
      await base44.entities.AsignacionCamarero.create({
        pedido_id: pedido.id,
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        camarero_codigo: camarero.codigo,
        estado: 'pendiente',
        fecha_pedido: pedido.dia,
        hora_entrada: pedido.entrada,
        hora_salida: pedido.salida
      });

      // Crear notificación para el camarero
      await base44.entities.NotificacionCamarero.create({
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        pedido_id: pedido.id,
        tipo: 'nueva_asignacion',
        titulo: '🔔 Nueva Asignación',
        mensaje: `Has sido asignado al evento de ${pedido.cliente}`,
        cliente: pedido.cliente,
        lugar_evento: pedido.lugar_evento,
        fecha: pedido.dia,
        hora_entrada: pedido.entrada,
        hora_salida: pedido.salida,
        leida: false,
        respondida: false,
        respuesta: 'pendiente'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      toast.success('Camarero asignado');
    },
    onError: (error) => {
      toast.error(error.message || 'Error al asignar camarero');
    }
  });

  const desasignarCamareroMutation = useMutation({
    mutationFn: async (asignacionId) => {
      await base44.entities.AsignacionCamarero.delete(asignacionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Camarero desasignado');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let dataToUpdate = {};
    switch(campo) {
      case 'cliente':
        dataToUpdate = { cliente: valor };
        break;
      case 'fecha':
        dataToUpdate = { dia: valor };
        break;
      case 'lugar':
        dataToUpdate = { lugar_evento: valor };
        break;
      case 'link_ubicacion':
        dataToUpdate = { link_ubicacion: valor };
        break;
      case 'estado':
        dataToUpdate = { estado_evento: valor };
        break;
    }

    updateMutation.mutate({ id: pedido.id, data: dataToUpdate });
  };

  const getTitulo = () => {
    switch(campo) {
      case 'cliente': return 'Editar Cliente';
      case 'fecha': return 'Editar Fecha';
      case 'lugar': return 'Editar Lugar';
      case 'link_ubicacion': return 'Editar Link Ubicación';
      case 'camareros': return 'Gestionar Camareros';
      case 'estado': return 'Cambiar Estado';
      default: return 'Editar';
    }
  };

  const getIcon = () => {
    switch(campo) {
      case 'fecha': return <Calendar className="w-5 h-5 text-[#1e3a5f]" />;
      case 'lugar': 
      case 'link_ubicacion': 
        return <MapPin className="w-5 h-5 text-[#1e3a5f]" />;
      case 'camareros': return <Users className="w-5 h-5 text-[#1e3a5f]" />;
      case 'estado': return <Ban className="w-5 h-5 text-[#1e3a5f]" />;
      default: return null;
    }
  };

  const camarerosDisponibles = camareros.filter(c => 
    c.disponible && !asignaciones.some(a => a.camarero_id === c.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>

        {campo === 'camareros' ? (
          <div className="space-y-4">
            {/* Camareros Asignados */}
            <div>
              <Label className="mb-2 block">Camareros Asignados ({asignaciones.length})</Label>
              {asignaciones.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No hay camareros asignados</p>
              ) : (
                <div className="space-y-2">
                  {asignaciones.map(asig => (
                    <div key={asig.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{asig.camarero_nombre}</p>
                        <p className="text-xs text-slate-500">#{asig.camarero_codigo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          asig.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                          asig.estado === 'enviado' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {asig.estado}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => desasignarCamareroMutation.mutate(asig.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Asignar Nuevo Camarero */}
            <div>
              <Label className="mb-2 block">Asignar Camarero</Label>
              <Select onValueChange={(id) => asignarCamareroMutation.mutate(id)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar camarero..." />
                </SelectTrigger>
                <SelectContent>
                  {camarerosDisponibles.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500">No hay camareros disponibles</div>
                  ) : (
                    camarerosDisponibles.map(cam => (
                      <SelectItem key={cam.id} value={cam.id}>
                        {cam.nombre} (#{cam.codigo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : campo === 'estado' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Estado del Evento</Label>
              <Select value={valor} onValueChange={setValor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planificado">Planificado</SelectItem>
                  <SelectItem value="en_curso">En Curso</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">
                    <span className="flex items-center gap-2 text-red-600">
                      <Ban className="w-4 h-4" />
                      Cancelado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {valor === 'cancelado' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ Al cancelar el pedido, se notificará a los camareros asignados y se liberarán las asignaciones.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                Guardar
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                {campo === 'cliente' && 'Nombre del Cliente'}
                {campo === 'fecha' && 'Fecha del Evento'}
                {campo === 'lugar' && 'Lugar del Evento'}
                {campo === 'link_ubicacion' && 'Link de Google Maps'}
              </Label>
              {campo === 'fecha' ? (
                <Input
                  type="date"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              ) : (
                <Input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder={
                    campo === 'cliente' ? 'Ej: Restaurant El Jardín' :
                    campo === 'lugar' ? 'Ej: Salón de Eventos Centro' :
                    campo === 'link_ubicacion' ? 'https://maps.google.com/...' : ''
                  }
                  required
                />
              )}
            </div>

            {pedido && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-500 mb-1">Valor Actual:</p>
                <p className="font-medium text-slate-700">
                  {campo === 'cliente' && pedido.cliente}
                  {campo === 'fecha' && (pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : '-')}
                  {campo === 'lugar' && (pedido.lugar_evento || 'Sin especificar')}
                  {campo === 'link_ubicacion' && (pedido.link_ubicacion || 'Sin especificar')}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                Guardar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}