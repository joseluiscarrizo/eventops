import { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Check, X, Clock, Palmtree, Heart } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

const tipoConfig = {
  disponible: { color: 'bg-emerald-500', icon: Check, label: 'Disponible' },
  no_disponible: { color: 'bg-red-500', icon: X, label: 'No Disponible' },
  festivo: { color: 'bg-purple-500', icon: Palmtree, label: 'Festivo' },
  vacaciones: { color: 'bg-blue-500', icon: Palmtree, label: 'Vacaciones' },
  baja: { color: 'bg-amber-500', icon: Heart, label: 'Baja' },
  parcial: { color: 'bg-cyan-500', icon: Clock, label: 'Parcial' }
};

export default function CalendarioDisponibilidad({ 
  camarero, 
  disponibilidades, 
  festivos,
  onSelectDay,
  selectedDate 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDisponibilidadDia = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Verificar festivos primero
    const festivo = festivos.find(f => f.fecha === dateStr);
    if (festivo) {
      return { tipo: 'festivo', info: festivo };
    }

    // Buscar disponibilidad específica
    const disp = disponibilidades.find(d => d.fecha === dateStr);
    if (disp) {
      return { tipo: disp.tipo, info: disp };
    }

    // Buscar disponibilidad recurrente
    const dayOfWeek = getDay(date);
    const recurrente = disponibilidades.find(d => d.recurrente && d.dia_semana === dayOfWeek);
    if (recurrente) {
      return { tipo: recurrente.tipo, info: recurrente };
    }

    return { tipo: 'disponible', info: null };
  };

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const primerDiaSemana = getDay(startOfMonth(currentMonth));

  return (
    <Card className="bg-white shadow-lg border-slate-100 p-6">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#1e3a5f]" />
          <h3 className="font-semibold text-slate-800">
            {camarero ? `Disponibilidad: ${camarero.nombre}` : 'Calendario de Disponibilidad'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-slate-700 min-w-[150px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-sm font-medium text-slate-500 py-2">
            {dia}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-1">
        {/* Espacios vacíos antes del primer día */}
        {Array.from({ length: primerDiaSemana }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {days.map(day => {
          const disp = getDisponibilidadDia(day);
          const config = tipoConfig[disp.tipo];
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDay(day, disp)}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center relative
                transition-all border-2
                ${isSelected ? 'border-[#1e3a5f] shadow-lg' : 'border-transparent'}
                ${isCurrentDay ? 'ring-2 ring-[#1e3a5f] ring-offset-2' : ''}
                ${disp.tipo !== 'disponible' ? 'bg-opacity-20' : 'hover:bg-slate-50'}
              `}
              style={{
                backgroundColor: disp.tipo !== 'disponible' ? `${config.color.replace('bg-', '')}20` : undefined
              }}
            >
              <span className={`text-sm font-medium ${isCurrentDay ? 'text-[#1e3a5f]' : 'text-slate-700'}`}>
                {format(day, 'd')}
              </span>
              {disp.tipo !== 'disponible' && (
                <div className={`w-2 h-2 rounded-full ${config.color} mt-1`} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-3">
          {Object.entries(tipoConfig).map(([tipo, config]) => (
            <div key={tipo} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span className="text-xs text-slate-600">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}