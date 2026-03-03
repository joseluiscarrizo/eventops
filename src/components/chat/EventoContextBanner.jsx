import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, ChevronDown, ChevronUp, Shirt, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EventoContextBanner({ grupo }) {
  const [expanded, setExpanded] = useState(false);

  const { data: pedido } = useQuery({
    queryKey: ['pedido-chat', grupo?.pedido_id],
    queryFn: () => base44.entities.Pedido.get(grupo.pedido_id),
    enabled: !!grupo?.pedido_id
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones-chat', grupo?.pedido_id],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ pedido_id: grupo.pedido_id }),
    enabled: !!grupo?.pedido_id
  });

  const asignacionesConQR = asignaciones.filter(a => a.qr_token);
  const fichajeUrl = asignacionesConQR.length > 0
    ? `${globalThis.location.origin}/FichajeQR?pedido_id=${grupo.pedido_id}`
    : null;

  const copiarLink = () => {
    navigator.clipboard.writeText(fichajeUrl);
    toast.success('Link de fichaje copiado');
  };

  if (!pedido) return null;

  const confirmados = asignaciones.filter(a => a.estado === 'confirmado' || a.estado === 'alta').length;
  const pendientes = asignaciones.filter(a => a.estado === 'pendiente' || a.estado === 'enviado').length;
  const turnoPrincipal = pedido.turnos?.[0] || {};

  return (
    <Card className="mx-4 mt-3 border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800 truncate text-sm">{pedido.cliente}</p>
              {fichajeUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); copiarLink(); }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 rounded px-1.5 py-0.5 flex-shrink-0"
                  title="Copiar link de fichaje QR"
                >
                  <QrCode className="w-3 h-3" />
                  Fichaje QR
                  <Copy className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              {pedido.dia && (
                <span>{format(parseISO(pedido.dia), "dd MMM yyyy", { locale: es })}</span>
              )}
              {pedido.lugar_evento && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {pedido.lugar_evento}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">{confirmados} confirm.</Badge>
          {pendientes > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{pendientes} pend.</Badge>}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-blue-100 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{turnoPrincipal.entrada || pedido.entrada || '-'} → {turnoPrincipal.salida || pedido.salida || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{asignaciones.length} camareros asignados</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Shirt className="w-4 h-4 text-slate-400" />
              <span className="capitalize">Camisa {pedido.camisa || 'blanca'}</span>
            </div>
            {pedido.notas && (
              <div className="col-span-2 md:col-span-4 text-xs text-slate-500 bg-white rounded p-2 border">
                📝 {pedido.notas}
              </div>
            )}
          </div>
          {asignaciones.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {asignaciones.map(a => (
                <Badge
                  key={a.id}
                  variant="outline"
                  className={`text-xs ${
                    a.estado === 'confirmado' || a.estado === 'alta'
                      ? 'border-emerald-300 text-emerald-700'
                      : 'border-amber-300 text-amber-700'
                  }`}
                >
                  {a.camarero_nombre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}