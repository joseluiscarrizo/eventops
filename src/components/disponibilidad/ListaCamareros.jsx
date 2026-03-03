import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, AlertCircle } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function ListaCamareros({ 
  camareros, 
  disponibilidades,
  selectedCamarero, 
  onSelectCamarero 
}) {
  const [busqueda, setBusqueda] = useState('');

  const getProximaAusencia = (camareroId) => {
    const hoy = new Date();
    const proximos7Dias = Array.from({ length: 7 }, (_, i) => 
      format(addDays(hoy, i), 'yyyy-MM-dd')
    );
    
    const ausencias = disponibilidades.filter(d => 
      d.camarero_id === camareroId && 
      d.tipo !== 'disponible' &&
      proximos7Dias.includes(d.fecha)
    );

    return ausencias.length > 0 ? ausencias[0] : null;
  };

  const getEstadoHoy = (camareroId) => {
    const hoyStr = format(new Date(), 'yyyy-MM-dd');
    return disponibilidades.find(d => 
      d.camarero_id === camareroId && d.fecha === hoyStr
    );
  };

  const camarerosFiltrados = camareros.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Card className="bg-white shadow-lg border-slate-100 h-full flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#1e3a5f]" />
          Camareros
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 border-slate-200"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {camarerosFiltrados.map(camarero => {
            const isSelected = selectedCamarero?.id === camarero.id;
            const estadoHoy = getEstadoHoy(camarero.id);
            const proximaAusencia = getProximaAusencia(camarero.id);

            return (
              <motion.div
                key={camarero.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectCamarero(camarero)}
                className={`
                  p-3 rounded-xl border cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{camarero.nombre}</span>
                      <span className="text-xs text-slate-400 font-mono">#{camarero.codigo}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      {estadoHoy ? (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            estadoHoy.tipo === 'disponible' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                            estadoHoy.tipo === 'parcial' ? 'border-cyan-200 text-cyan-700 bg-cyan-50' :
                            'border-red-200 text-red-700 bg-red-50'
                          }`}
                        >
                          {estadoHoy.tipo === 'disponible' ? 'Hoy: Disponible' :
                           estadoHoy.tipo === 'parcial' ? `Hoy: ${estadoHoy.hora_inicio}-${estadoHoy.hora_fin}` :
                           `Hoy: ${estadoHoy.tipo.replace('_', ' ')}`}
                        </Badge>
                      ) : camarero.disponible ? (
                        <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                          Hoy: Disponible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                          No disponible
                        </Badge>
                      )}
                    </div>

                    {proximaAusencia && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>
                          {isToday(new Date(proximaAusencia.fecha)) ? 'Hoy' : 
                           isTomorrow(new Date(proximaAusencia.fecha)) ? 'Mañana' :
                           format(new Date(proximaAusencia.fecha), 'dd/MM')}: {proximaAusencia.tipo.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-500 text-center">
          {camareros.length} camareros registrados
        </p>
      </div>
    </Card>
  );
}