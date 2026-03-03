import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, TrendingUp, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CargaCamareros({ mes }) {
  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  // Calcular carga de trabajo por camarero
  const cargaPorCamarero = useMemo(() => {
    const inicioMes = format(startOfMonth(mes), 'yyyy-MM-dd');
    const finMes = format(endOfMonth(mes), 'yyyy-MM-dd');
    
    const carga = camareros.map(camarero => {
      const asignacionesMes = asignaciones.filter(a => 
        a.camarero_id === camarero.id && 
        a.fecha_pedido >= inicioMes && 
        a.fecha_pedido <= finMes
      );
      
      let totalHoras = 0;
      const diasTrabajados = new Set();
      
      asignacionesMes.forEach(asig => {
        diasTrabajados.add(asig.fecha_pedido);
        
        if (asig.hora_entrada && asig.hora_salida) {
          const [entH, entM] = asig.hora_entrada.split(':').map(Number);
          const [salH, salM] = asig.hora_salida.split(':').map(Number);
          let horas = (salH + salM/60) - (entH + entM/60);
          if (horas < 0) horas += 24;
          totalHoras += horas;
        }
      });
      
      return {
        camarero,
        asignaciones: asignacionesMes.length,
        diasTrabajados: diasTrabajados.size,
        totalHoras: Math.round(totalHoras * 10) / 10
      };
    });
    
    return carga.sort((a, b) => b.totalHoras - a.totalHoras);
  }, [camareros, asignaciones, mes]);

  const maxHoras = Math.max(...cargaPorCamarero.map(c => c.totalHoras), 1);
  const promedioHoras = cargaPorCamarero.reduce((sum, c) => sum + c.totalHoras, 0) / cargaPorCamarero.length || 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#1e3a5f]" />
          Carga de Trabajo - {format(mes, 'MMMM yyyy', { locale: es })}
        </h3>
        <Badge variant="outline">
          Promedio: {promedioHoras.toFixed(1)}h
        </Badge>
      </div>

      <div className="space-y-3">
        {cargaPorCamarero.slice(0, 10).map(({ camarero, asignaciones, diasTrabajados, totalHoras }) => {
          const porcentaje = (totalHoras / maxHoras) * 100;
          
          return (
            <div key={camarero.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{camarero.nombre}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {diasTrabajados}d
                  </span>
                  <span className="font-semibold text-slate-700">{totalHoras}h</span>
                </div>
              </div>
              
              <div className="relative">
                <Progress value={porcentaje} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{asignaciones} asignaciones</span>
                  {totalHoras > promedioHoras * 1.5 && (
                    <Badge variant="outline" className="text-xs h-5 bg-red-50 text-red-700">
                      Alta carga
                    </Badge>
                  )}
                  {totalHoras < promedioHoras * 0.5 && totalHoras > 0 && (
                    <Badge variant="outline" className="text-xs h-5 bg-blue-50 text-blue-700">
                      Disponible
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {cargaPorCamarero.length === 0 && (
          <p className="text-center text-slate-500 py-8">No hay datos de carga de trabajo</p>
        )}
      </div>
    </Card>
  );
}