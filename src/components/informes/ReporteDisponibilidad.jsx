import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Calendar, Users, Check, X, Clock, Palmtree } from 'lucide-react';
import { ExportadorExcel } from './ExportadorExcel';
import { format, parseISO, eachDayOfInterval, addDays, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

const tipoColors = {
  disponible: 'bg-emerald-100 text-emerald-700',
  no_disponible: 'bg-red-100 text-red-700',
  vacaciones: 'bg-blue-100 text-blue-700',
  baja: 'bg-amber-100 text-amber-700',
  festivo: 'bg-purple-100 text-purple-700',
  parcial: 'bg-cyan-100 text-cyan-700'
};

export default function ReporteDisponibilidad() {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: disponibilidades = [] } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: () => base44.entities.Disponibilidad.list('-fecha', 1000)
  });

  const { data: festivos = [] } = useQuery({
    queryKey: ['festivos'],
    queryFn: () => base44.entities.Festivo.list('fecha')
  });

  // Generar días del rango
  const dias = useMemo(() => {
    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [fechaInicio, fechaFin]);

  // Obtener disponibilidad de un camarero en un día
  const getDisponibilidad = (camareroId, fecha) => {
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    
    // Verificar festivo
    const festivo = festivos.find(f => f.fecha === fechaStr && f.afecta_todos);
    if (festivo) return { tipo: 'festivo', info: festivo.nombre };

    // Buscar disponibilidad específica
    const disp = disponibilidades.find(d => 
      d.camarero_id === camareroId && d.fecha === fechaStr
    );
    if (disp) {
      return { 
        tipo: disp.tipo, 
        info: disp.tipo === 'parcial' ? `${disp.hora_inicio}-${disp.hora_fin}` : disp.motivo 
      };
    }

    // Buscar disponibilidad recurrente
    const dayOfWeek = getDay(fecha);
    const recurrente = disponibilidades.find(d => 
      d.camarero_id === camareroId && d.recurrente && d.dia_semana === dayOfWeek
    );
    if (recurrente) {
      return { 
        tipo: recurrente.tipo, 
        info: recurrente.tipo === 'parcial' ? `${recurrente.hora_inicio}-${recurrente.hora_fin}` : recurrente.motivo 
      };
    }

    return { tipo: 'disponible', info: null };
  };

  // Estadísticas de disponibilidad
  const estadisticas = useMemo(() => {
    const stats = camareros.map(camarero => {
      let disponibles = 0;
      let noDisponibles = 0;
      let parciales = 0;
      let vacaciones = 0;
      let bajas = 0;

      dias.forEach(dia => {
        const disp = getDisponibilidad(camarero.id, dia);
        switch(disp.tipo) {
          case 'disponible': disponibles++; break;
          case 'no_disponible': noDisponibles++; break;
          case 'parcial': parciales++; break;
          case 'vacaciones': vacaciones++; break;
          case 'baja': bajas++; break;
          case 'festivo': noDisponibles++; break;
        }
      });

      const tasaDisponibilidad = dias.length > 0 
        ? Math.round(((disponibles + parciales) / dias.length) * 100) 
        : 0;

      return {
        id: camarero.id,
        nombre: camarero.nombre,
        codigo: camarero.codigo,
        disponibles,
        noDisponibles,
        parciales,
        vacaciones,
        bajas,
        tasaDisponibilidad
      };
    });

    return stats.sort((a, b) => b.tasaDisponibilidad - a.tasaDisponibilidad);
  }, [camareros, dias, disponibilidades, festivos]);

  // Resumen global
  const resumenGlobal = useMemo(() => {
    const totalDias = dias.length * camareros.length;
    let disponibles = 0;
    let noDisponibles = 0;

    camareros.forEach(c => {
      dias.forEach(d => {
        const disp = getDisponibilidad(c.id, d);
        if (disp.tipo === 'disponible' || disp.tipo === 'parcial') {
          disponibles++;
        } else {
          noDisponibles++;
        }
      });
    });

    return {
      totalDias,
      disponibles,
      noDisponibles,
      tasa: totalDias > 0 ? Math.round((disponibles / totalDias) * 100) : 0
    };
  }, [camareros, dias, disponibilidades, festivos]);

  const exportarExcel = () => {
    ExportadorExcel.exportarDisponibilidad(estadisticas, fechaInicio, fechaFin);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Desde</label>
            <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Hasta</label>
            <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-44" />
          </div>
          <Button variant="outline" onClick={exportarExcel} className="ml-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </Card>

      {/* Resumen global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Días Analizados</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{dias.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Camareros</span>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{camareros.length}</p>
        </Card>
        <Card className="p-4 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Check className="w-4 h-4" />
            <span className="text-xs">Días Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{resumenGlobal.disponibles}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <span className="text-xs">Tasa Disponibilidad</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{resumenGlobal.tasa}%</p>
        </Card>
      </div>

      {/* Leyenda */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <span className="text-sm font-medium text-slate-700">Leyenda:</span>
          {Object.entries(tipoColors).map(([tipo, color]) => (
            <div key={tipo} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${color.split(' ')[0]}`}></div>
              <span className="text-sm text-slate-600 capitalize">{tipo.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Calendario visual */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Calendario de Disponibilidad</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Camarero</TableHead>
                {dias.map(dia => (
                  <TableHead key={dia.toISOString()} className="text-center min-w-[60px] text-xs">
                    <div>{format(dia, 'EEE', { locale: es })}</div>
                    <div>{format(dia, 'dd')}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {camareros.map(camarero => (
                <TableRow key={camarero.id}>
                  <TableCell className="sticky left-0 bg-white z-10 font-medium">
                    {camarero.nombre}
                  </TableCell>
                  {dias.map(dia => {
                    const disp = getDisponibilidad(camarero.id, dia);
                    const colorClass = tipoColors[disp.tipo] || tipoColors.disponible;
                    
                    return (
                      <TableCell 
                        key={dia.toISOString()} 
                        className={`text-center p-1 ${colorClass}`}
                        title={disp.info || disp.tipo}
                      >
                        {disp.tipo === 'disponible' ? <Check className="w-4 h-4 mx-auto" /> :
                         disp.tipo === 'parcial' ? <Clock className="w-4 h-4 mx-auto" /> :
                         disp.tipo === 'vacaciones' ? <Palmtree className="w-4 h-4 mx-auto" /> :
                         <X className="w-4 h-4 mx-auto" />}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Tabla de estadísticas */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Estadísticas por Camarero</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Camarero</TableHead>
              <TableHead className="text-center">Disponibles</TableHead>
              <TableHead className="text-center">No Disponibles</TableHead>
              <TableHead className="text-center">Parciales</TableHead>
              <TableHead className="text-center">Vacaciones</TableHead>
              <TableHead className="text-center">Bajas</TableHead>
              <TableHead className="text-center">Tasa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estadisticas.map(e => (
              <TableRow key={e.id}>
                <TableCell>
                  <span className="font-medium">{e.nombre}</span>
                  <span className="text-xs text-slate-400 ml-2">#{e.codigo}</span>
                </TableCell>
                <TableCell className="text-center text-emerald-600 font-medium">{e.disponibles}</TableCell>
                <TableCell className="text-center text-red-600 font-medium">{e.noDisponibles}</TableCell>
                <TableCell className="text-center text-cyan-600 font-medium">{e.parciales}</TableCell>
                <TableCell className="text-center text-blue-600 font-medium">{e.vacaciones}</TableCell>
                <TableCell className="text-center text-amber-600 font-medium">{e.bajas}</TableCell>
                <TableCell className="text-center">
                  <Badge className={e.tasaDisponibilidad >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                                   e.tasaDisponibilidad >= 50 ? 'bg-amber-100 text-amber-700' : 
                                   'bg-red-100 text-red-700'}>
                    {e.tasaDisponibilidad}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}