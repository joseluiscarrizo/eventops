import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CalendarioDisponibilidad from '../components/disponibilidad/CalendarioDisponibilidad';
import FormularioDisponibilidad from '../components/disponibilidad/FormularioDisponibilidad';
import ListaCamareros from '../components/disponibilidad/ListaCamareros';
import GestionFestivos from '../components/disponibilidad/GestionFestivos';

export default function Disponibilidad() {
  const [selectedCamarero, setSelectedCamarero] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [existingDisponibilidad, setExistingDisponibilidad] = useState(null);

  const queryClient = useQueryClient();

  const { data: camareros = [], isLoading: loadingCamareros } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: disponibilidades = [], isLoading: loadingDisp } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: () => base44.entities.Disponibilidad.list('-fecha', 500)
  });

  const { data: festivos = [], isLoading: loadingFestivos } = useQuery({
    queryKey: ['festivos'],
    queryFn: () => base44.entities.Festivo.list('fecha')
  });

  const disponibilidadesCamarero = selectedCamarero 
    ? disponibilidades.filter(d => d.camarero_id === selectedCamarero.id)
    : [];

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Buscar si ya existe una disponibilidad para esa fecha y camarero
      const existing = disponibilidades.find(d => 
        d.camarero_id === data.camarero_id && 
        d.fecha === data.fecha &&
        !d.recurrente
      );

      if (existing) {
        return base44.entities.Disponibilidad.update(existing.id, data);
      } else {
        return base44.entities.Disponibilidad.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidades'] });
      setSelectedDate(null);
      setExistingDisponibilidad(null);
      toast.success('Disponibilidad guardada');
    },
    onError: (error) => {
      console.error('Error al guardar disponibilidad:', error);
      toast.error('Error al guardar disponibilidad: ' + (error.message || 'Error desconocido'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Disponibilidad.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidades'] });
      setSelectedDate(null);
      setExistingDisponibilidad(null);
      toast.success('Disponibilidad eliminada');
    },
    onError: (error) => {
      console.error('Error al eliminar disponibilidad:', error);
      toast.error('Error al eliminar disponibilidad: ' + (error.message || 'Error desconocido'));
    }
  });

  const handleSelectDay = (date, disp) => {
    setSelectedDate(date);
    setExistingDisponibilidad(disp);
  };

  const handleSave = (data) => {
    saveMutation.mutate(data);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const isLoading = loadingCamareros || loadingDisp || loadingFestivos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-[#1e3a5f]" />
            Disponibilidad de Camareros
          </h1>
          <p className="text-slate-500 mt-1">
            Gestiona la disponibilidad, festivos y ausencias de tu equipo
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Camareros</p>
            <p className="text-2xl font-bold text-slate-800">{camareros.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Disponibles Hoy</p>
            <p className="text-2xl font-bold text-emerald-600">
              {camareros.filter(c => {
                const hoy = format(new Date(), 'yyyy-MM-dd');
                const disp = disponibilidades.find(d => d.camarero_id === c.id && d.fecha === hoy);
                return !disp || disp.tipo === 'disponible' || disp.tipo === 'parcial';
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Ausencias Hoy</p>
            <p className="text-2xl font-bold text-red-600">
              {disponibilidades.filter(d => {
                const hoy = format(new Date(), 'yyyy-MM-dd');
                return d.fecha === hoy && d.tipo !== 'disponible' && d.tipo !== 'parcial';
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Festivos Registrados</p>
            <p className="text-2xl font-bold text-purple-600">{festivos.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#1e3a5f] mx-auto mb-3" />
              <p className="text-slate-500">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de Camareros */}
            <div className="lg:col-span-3" style={{ height: 'calc(100vh - 350px)', minHeight: '500px' }}>
              <ListaCamareros
                camareros={camareros}
                disponibilidades={disponibilidades}
                selectedCamarero={selectedCamarero}
                onSelectCamarero={setSelectedCamarero}
              />
            </div>

            {/* Calendario */}
            <div className="lg:col-span-5">
              <CalendarioDisponibilidad
                camarero={selectedCamarero}
                disponibilidades={disponibilidadesCamarero}
                festivos={festivos}
                onSelectDay={handleSelectDay}
                selectedDate={selectedDate}
              />
            </div>

            {/* Panel derecho */}
            <div className="lg:col-span-4 space-y-6">
              <FormularioDisponibilidad
                camarero={selectedCamarero}
                selectedDate={selectedDate}
                existingDisponibilidad={existingDisponibilidad}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => {
                  setSelectedDate(null);
                  setExistingDisponibilidad(null);
                }}
              />
              
              <GestionFestivos festivos={festivos} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}