import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CargaTrabajoCamareros({ mes = new Date() }) {
  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-fecha_pedido', 2000)
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  // Calcular carga de trabajo por camarero para el mes
  const cargaMensual = useMemo(() => {
    const inicioMes = format(startOfMonth(mes), 'yyyy-MM-dd');
    const finMes = format(endOfMonth(mes), 'yyyy-MM-dd');
    
    const asignacionesMes = asignaciones.filter(a => 
      a.fecha_pedido >= inicioMes && a.fecha_pedido <= finMes
    );

    return camareros.map(camarero => {
      const asignsCamarero = asignacionesMes.filter(a => a.camarero_id === camarero.id);
      
      let totalHoras = 0;
      let diasUnicos = new Set();
      let confirmadas = 0;
      let pendientes = 0;
      
      asignsCamarero.forEach(asig => {
        diasUnicos.add(asig.fecha_pedido);
        
        if (asig.estado === 'confirmado' || asig.estado === 'alta') {
          confirmadas++;
        } else {
          pendientes++;
        }
        
        // Calcular horas
        if (asig.hora_entrada && asig.hora_salida) {
          const [entH, entM] = asig.hora_entrada.split(':').map(Number);
          const [salH, salM] = asig.hora_salida.split(':').map(Number);
          let horas = (salH + salM/60) - (entH + entM/60);
          if (horas < 0) horas += 24;
          totalHoras += horas;
        }
      });

      // Calcular porcentaje de carga (asumiendo 160 horas máximo mensual)
      const porcentajeCarga = Math.min((totalHoras / 160) * 100, 100);
      
      // Nivel de alerta
      let nivel = 'normal';
      if (porcentajeCarga >= 90) nivel = 'sobrecarga';
      else if (porcentajeCarga >= 70) nivel = 'alto';
      else if (porcentajeCarga < 20 && asignsCamarero.length > 0) nivel = 'bajo';

      return {
        camarero,
        asignaciones: asignsCamarero,
        totalHoras: Math.round(totalHoras * 10) / 10,
        diasTrabajados: diasUnicos.size,
        confirmadas,
        pendientes,
        porcentajeCarga: Math.round(porcentajeCarga),
        nivel
      };
    })
    .filter(c => c.camarero.disponible && !c.camarero.en_reserva)
    .sort((a, b) => b.totalHoras - a.totalHoras);
  }, [camareros, asignaciones, mes]);

  const estadisticasGenerales = useMemo(() => {
    const trabajando = cargaMensual.filter(c => c.asignaciones.length > 0).length;
    const sinAsignar = cargaMensual.filter(c => c.asignaciones.length === 0).length;
    const sobrecargados = cargaMensual.filter(c => c.nivel === 'sobrecarga').length;
    const horasPromedioTotal = cargaMensual.reduce((sum, c) => sum + c.totalHoras, 0);
    const promedio = trabajando > 0 ? Math.round((horasPromedioTotal / trabajando) * 10) / 10 : 0;

    return { trabajando, sinAsignar, sobrecargados, promedio };
  }, [cargaMensual]);

  const nivelColors = {
    sobrecarga: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    alto: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    normal: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    bajo: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-[#1e3a5f]" />
          Carga de Trabajo
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          {format(mes, "MMMM yyyy", { locale: es })}
        </p>
        
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-white rounded-lg border">
            <p className="text-xs text-slate-500">Trabajando</p>
            <p className="text-lg font-bold text-emerald-600">{estadisticasGenerales.trabajando}</p>
          </div>
          <div className="p-2 bg-white rounded-lg border">
            <p className="text-xs text-slate-500">Sin asignar</p>
            <p className="text-lg font-bold text-slate-600">{estadisticasGenerales.sinAsignar}</p>
          </div>
          <div className="p-2 bg-white rounded-lg border">
            <p className="text-xs text-slate-500">Horas promedio</p>
            <p className="text-lg font-bold text-[#1e3a5f]">{estadisticasGenerales.promedio}h</p>
          </div>
          <div className="p-2 bg-white rounded-lg border">
            <p className="text-xs text-slate-500">Sobrecarga</p>
            <p className="text-lg font-bold text-red-600">{estadisticasGenerales.sobrecargados}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {cargaMensual.map(({ camarero, totalHoras, diasTrabajados, confirmadas, pendientes, porcentajeCarga, nivel }) => {
            const colors = nivelColors[nivel];
            
            return (
              <div 
                key={camarero.id}
                className={`p-3 rounded-lg border-2 ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{camarero.nombre}</p>
                    <p className="text-xs text-slate-500 font-mono">#{camarero.codigo}</p>
                  </div>
                  <Badge className={colors.badge}>
                    {porcentajeCarga}%
                  </Badge>
                </div>

                <Progress value={porcentajeCarga} className="h-2 mb-2" />

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-3 h-3" />
                    <span>{totalHoras}h</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Calendar className="w-3 h-3" />
                    <span>{diasTrabajados} días</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Users className="w-3 h-3" />
                    <span>{confirmadas + pendientes}</span>
                  </div>
                </div>

                {confirmadas + pendientes > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-3 h-3" />
                      {confirmadas}
                    </span>
                    {pendientes > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        {pendientes}
                      </span>
                    )}
                  </div>
                )}

                {nivel === 'sobrecarga' && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Cerca del límite mensual
                  </p>
                )}
              </div>
            );
          })}
          
          {cargaMensual.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay camareros disponibles</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}