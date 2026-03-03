import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Ban, FileText, Copy, Repeat, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function PedidoCardMobile({ pedido, asignaciones, onEdicionRapida, onDuplicar, onRecurrente, onEdit, onDelete, onParte, onAsignar }) {
  const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
  const turnos = pedido.turnos?.length > 0
    ? pedido.turnos
    : [{ cantidad_camareros: pedido.cantidad_camareros || 0, entrada: pedido.entrada, salida: pedido.salida, t_horas: pedido.t_horas }];

  const estadoClass =
    pedido.estado_evento === 'cancelado' ? 'bg-red-100 text-red-700' :
    pedido.estado_evento === 'finalizado' ? 'bg-slate-100 text-slate-700' :
    pedido.estado_evento === 'en_curso' ? 'bg-blue-100 text-blue-700' :
    'bg-emerald-100 text-emerald-700';

  const estadoLabel =
    pedido.estado_evento === 'cancelado' ? 'Cancelado' :
    pedido.estado_evento === 'finalizado' ? 'Finalizado' :
    pedido.estado_evento === 'en_curso' ? 'En Curso' : 'Planificado';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs font-semibold text-orange-700">{pedido.codigo_pedido || '-'}</span>
          <h3 className="font-semibold text-slate-800 text-base leading-tight mt-0.5">{pedido.cliente}</h3>
        </div>
        <Badge
          className={`cursor-pointer shrink-0 ${estadoClass}`}
          onClick={() => onEdicionRapida(pedido, 'estado')}
        >
          {pedido.estado_evento === 'cancelado' && <Ban className="w-3 h-3 mr-1" />}
          {estadoLabel}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm text-slate-600">
        {pedido.lugar_evento && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{pedido.lugar_evento}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>{pedido.dia ? format(parseISO(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}</span>
        </div>
      </div>

      {/* Shifts */}
      <div className="space-y-1">
        {turnos.map((turno, i) => {
          const asignadosEnTurno = asignacionesPedido.filter(a => a.turno_index === i || (i === 0 && a.turno_index == null));
          return (
            <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-1.5">
              <span className="font-mono font-medium text-slate-700">{turno.entrada || '-'} – {turno.salida || '-'}</span>
              <span className="text-slate-400">·</span>
              <span>{turno.cantidad_camareros || 0} cam.</span>
              <span className="ml-auto text-slate-500">{asignadosEnTurno.length}/{turno.cantidad_camareros || 0} asig.</span>
            </div>
          );
        })}
      </div>

      {/* Assigned */}
      {asignacionesPedido.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asignacionesPedido.map(a => (
            <span key={a.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
              {a.camarero_nombre}
            </span>
          ))}
        </div>
      )}

      {/* Extra info */}
      <div className="flex gap-2 text-xs text-slate-500">
        {pedido.camisa && <span className="capitalize">👔 {pedido.camisa}</span>}
        {pedido.extra_transporte && <span>🚗 Transporte</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-1 pt-1 border-t border-slate-100 flex-wrap">
        {onParte && (
          <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => onParte(pedido)} title="Parte de servicio">
            <FileText className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => onDuplicar(pedido)} title="Duplicar">
          <Copy className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => onRecurrente(pedido)} title="Recurrente">
          <Repeat className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => onEdit(pedido)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2 text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el pedido de <strong>{pedido.cliente}</strong> del {pedido.dia}. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(pedido.id)} className="bg-red-600 hover:bg-red-700">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}