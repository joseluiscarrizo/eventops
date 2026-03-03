import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Mail, Phone, Calendar, FileText, TrendingUp, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InfoCliente({ cliente }) {
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-cliente', cliente?.id],
    queryFn: () => base44.entities.Pedido.list('-dia', 500),
    enabled: !!cliente
  });

  if (!cliente) {
    return (
      <Card className="p-6 bg-slate-50">
        <div className="text-center text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un cliente para ver su información</p>
        </div>
      </Card>
    );
  }

  const historialCliente = pedidos.filter(p => p.cliente_id === cliente.id);
  const pedidosRecientes = historialCliente.slice(0, 5);
  const totalPedidos = historialCliente.length;
  const proximoPedido = historialCliente.find(p => new Date(p.dia) > new Date());

  return (
    <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-[#1e3a5f]" />
        <h3 className="font-semibold text-slate-800">Información del Cliente</h3>
      </div>

      {/* Datos Básicos */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="text-lg font-bold text-slate-800">{cliente.nombre}</div>
          <div className="text-xs text-slate-500">#{cliente.codigo}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cliente.email_1 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-[#1e3a5f]" />
              <span className="truncate">{cliente.email_1}</span>
            </div>
          )}
          {cliente.telefono_1 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-[#1e3a5f]" />
              <span>{cliente.telefono_1}</span>
            </div>
          )}
        </div>

        {cliente.persona_contacto_1 && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-2 rounded">
            <User className="w-4 h-4 text-[#1e3a5f]" />
            <span>Contacto: {cliente.persona_contacto_1}</span>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/70 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-[#1e3a5f]" />
            <span className="text-xs text-slate-600">Total Pedidos</span>
          </div>
          <div className="text-2xl font-bold text-[#1e3a5f]">{totalPedidos}</div>
        </div>

        {proximoPedido && (
          <div className="bg-emerald-100 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span className="text-xs text-emerald-700">Próximo</span>
            </div>
            <div className="text-sm font-semibold text-emerald-800">
              {format(new Date(proximoPedido.dia), 'd MMM', { locale: es })}
            </div>
          </div>
        )}
      </div>

      {/* Notas */}
      {cliente.notas && (
        <div className="mb-4 p-3 bg-white/70 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-[#1e3a5f]" />
            <span className="text-xs font-semibold text-slate-700">Notas</span>
          </div>
          <p className="text-sm text-slate-600">{cliente.notas}</p>
        </div>
      )}

      {/* Historial Reciente */}
      {pedidosRecientes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#1e3a5f]" />
            <span className="text-sm font-semibold text-slate-700">Historial Reciente</span>
          </div>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {pedidosRecientes.map(pedido => (
                <div key={pedido.id} className="p-2 bg-white/70 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800">
                      {format(new Date(pedido.dia), 'dd/MM/yyyy', { locale: es })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {pedido.cantidad_camareros || 0} camareros
                    </Badge>
                  </div>
                  {pedido.lugar_evento && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{pedido.lugar_evento}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}