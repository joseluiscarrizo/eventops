import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function GruposList({ grupos, grupoSeleccionado, onSeleccionar, mensajesNoLeidos }) {
  return (
    <div className="space-y-2">
      {grupos.map(grupo => {
        const noLeidos = mensajesNoLeidos[grupo.id] || 0;
        const esActivo = grupoSeleccionado?.id === grupo.id;
        
        return (
          <Card
            key={grupo.id}
            className={cn(
              "p-4 cursor-pointer transition-all hover:shadow-md",
              esActivo ? "border-[#1e3a5f] border-2 bg-blue-50" : "hover:border-slate-300"
            )}
            onClick={() => onSeleccionar(grupo)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
                  <h3 className="font-semibold text-slate-800 truncate">{grupo.nombre}</h3>
                  {noLeidos > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
                      {noLeidos}
                    </Badge>
                  )}
                </div>
                
                {grupo.descripcion && (
                  <p className="text-sm text-slate-600 truncate mb-2">{grupo.descripcion}</p>
                )}
                
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(grupo.fecha_evento), "dd MMM", { locale: es })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {grupo.miembros?.length || 0} miembros
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}