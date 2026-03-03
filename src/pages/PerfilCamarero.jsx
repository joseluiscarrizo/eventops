import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Star, Award, Calendar, MapPin, Clock, Phone, Mail, AlertTriangle, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import GestionDocumentosCamarero from '../components/camareros/GestionDocumentosCamarero';
import { useIsMobile } from '../components/ui/useIsMobile';

const especialidadColors = {
  general: 'bg-slate-100 text-slate-700',
  cocteleria: 'bg-purple-100 text-purple-700',
  banquetes: 'bg-blue-100 text-blue-700',
  eventos_vip: 'bg-amber-100 text-amber-700',
  buffet: 'bg-emerald-100 text-emerald-700'
};

export default function PerfilCamarero() {
  const isMobile = useIsMobile();
  const urlParams = new URLSearchParams(globalThis.location.search);
  const camareroId = urlParams.get('id');

  const { data: camarero, isLoading } = useQuery({
    queryKey: ['camarero', camareroId],
    queryFn: async () => {
      const list = await base44.entities.Camarero.list();
      return list.find(c => c.id === camareroId);
    },
    enabled: !!camareroId
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones', camareroId],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ camarero_id: camareroId }, '-created_date', 500),
    enabled: !!camareroId
  });

  const { data: valoraciones = [] } = useQuery({
    queryKey: ['valoraciones', camareroId],
    queryFn: () => base44.entities.Valoracion.filter({ camarero_id: camareroId }, '-created_date', 100),
    enabled: !!camareroId
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 500)
  });

  const { data: disponibilidades = [] } = useQuery({
    queryKey: ['disponibilidades', camareroId],
    queryFn: () => base44.entities.Disponibilidad.filter({ camarero_id: camareroId }, '-fecha', 200),
    enabled: !!camareroId
  });

  // Estadísticas
  const stats = useMemo(() => {
    const total = asignaciones.length;
    const confirmados = asignaciones.filter(a => a.estado === 'confirmado' || a.estado === 'alta').length;
    const pendientes = asignaciones.filter(a => a.estado === 'pendiente').length;
    const tasaConfirmacion = total > 0 ? ((confirmados / total) * 100).toFixed(0) : 0;
    
    return { total, confirmados, pendientes, tasaConfirmacion };
  }, [asignaciones]);

  // Calcular cancelaciones last-minute dinámicamente desde asignaciones
  const cancelacionesLastMinute = useMemo(() => {
    return asignaciones.filter(asig => {
      if (asig.estado !== 'pendiente' && asig.estado !== 'enviado') return false;
      const pedido = pedidos.find(p => p.id === asig.pedido_id);
      if (!pedido?.dia) return false;
      // Buscamos si la asignación fue cancelada/revertida muy tarde
      // Como proxy: estado enviado/pendiente con fecha del evento ya pasada y hora_entrada conocida
      // Se detecta si el updated_date ocurrió menos de 2h antes del evento
      const horaEntrada = asig.hora_entrada || '00:00';
      const [h, m] = horaEntrada.split(':').map(Number);
      const fechaEvento = new Date(pedido.dia + 'T00:00:00');
      fechaEvento.setHours(h, m || 0, 0, 0);
      const updatedAt = asig.updated_date ? new Date(asig.updated_date) : null;
      if (!updatedAt) return false;
      const diffMs = fechaEvento - updatedAt;
      const diffHoras = diffMs / (1000 * 60 * 60);
      // Si el evento ya pasó y la última actualización fue menos de 2h antes del evento
      return fechaEvento < new Date() && diffHoras >= 0 && diffHoras < 2;
    }).length;
  }, [asignaciones, pedidos]);

  // Historial de eventos con detalles
  const historialEventos = useMemo(() => {
    return asignaciones.map(asig => {
      const pedido = pedidos.find(p => p.id === asig.pedido_id);
      const valoracion = valoraciones.find(v => v.pedido_id === asig.pedido_id);
      return { asig, pedido, valoracion };
    }).filter(item => item.pedido);
  }, [asignaciones, pedidos, valoraciones]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Cargando perfil...</p>
      </div>
    );
  }

  if (!camarero) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Camarero no encontrado</p>
          <Link to={createPageUrl('Camareros')}>
            <Button>Volver a Camareros</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sticky top bar on mobile */}
      {isMobile && (
        <div className="sticky top-16 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <Link to={createPageUrl('Camareros')}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="font-semibold text-slate-800 truncate">{camarero?.nombre || 'Perfil'}</span>
        </div>
      )}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con botón volver – solo desktop */}
        {!isMobile && (
        <div className="mb-6">
          <Link to={createPageUrl('Camareros')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Camareros
            </Button>
          </Link>
        </div>
        )}

        {/* Información Principal */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar y nombre */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center text-white text-3xl font-bold">
                {camarero.nombre.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Detalles */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{camarero.nombre}</h1>
                  <p className="text-slate-500 font-mono text-sm">#{camarero.codigo}</p>
                </div>
                <Badge className={camarero.disponible ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                  {camarero.disponible ? 'Disponible' : 'No Disponible'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {camarero.telefono && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    {camarero.telefono}
                  </div>
                )}
                {camarero.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    {camarero.email}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge className={especialidadColors[camarero.especialidad] || especialidadColors.general}>
                    {camarero.especialidad?.replace('_', ' ') || 'General'}
                  </Badge>
                </div>
                {camarero.experiencia_anios > 0 && (
                  <div className="text-sm text-slate-600">
                    <Award className="w-4 h-4 inline mr-1" />
                    {camarero.experiencia_anios} años experiencia
                  </div>
                )}
              </div>

              {/* Valoración */}
              {camarero.valoracion_promedio > 0 && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-bold text-slate-800">{camarero.valoracion_promedio.toFixed(1)}</span>
                    <span className="text-slate-500">({camarero.total_valoraciones} valoraciones)</span>
                  </div>
                </div>
              )}

              {/* Habilidades */}
              {camarero.habilidades?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-slate-500 mb-2">Habilidades:</p>
                  <div className="flex flex-wrap gap-1">
                    {camarero.habilidades.map(h => (
                      <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Idiomas */}
              {camarero.idiomas?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-slate-500 mb-2">Idiomas:</p>
                  <div className="flex flex-wrap gap-1">
                    {camarero.idiomas.map(i => (
                      <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {camarero.notas && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">{camarero.notas}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500 mb-1">Total Eventos</p>
            <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500 mb-1">Confirmados</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.confirmados}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500 mb-1">Pendientes</p>
            <p className="text-3xl font-bold text-amber-600">{stats.pendientes}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500 mb-1">Tasa Confirmación</p>
            <p className="text-3xl font-bold text-blue-600">{stats.tasaConfirmacion}%</p>
          </Card>
          <Card className="p-4 border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <p className="text-sm text-orange-700 font-medium">Canc. &lt;2h</p>
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {(camarero.cancelaciones_last_minute || 0) + cancelacionesLastMinute}
            </p>
            <p className="text-xs text-orange-500 mt-1">cancelaciones de última hora</p>
          </Card>
          <Card className="p-4 border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <Archive className="w-4 h-4 text-slate-500" />
              <p className="text-sm text-slate-600 font-medium">En Reserva</p>
            </div>
            <p className="text-3xl font-bold text-slate-600">{camarero.veces_en_reserva || 0}</p>
            <p className="text-xs text-slate-400 mt-1">veces en lista de reserva</p>
          </Card>
        </div>

        {/* Tabs: Historial, Valoraciones, Disponibilidad, Documentos */}
        <Tabs defaultValue="historial" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="valoraciones">Valoraciones</TabsTrigger>
            <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="historial">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Valoración</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialEventos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                          No hay eventos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      historialEventos.map(({ asig, pedido, valoracion }) => (
                        <TableRow key={asig.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {pedido.dia ? format(parseISO(pedido.dia), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{pedido.cliente}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="w-3 h-3" />
                              {pedido.lugar_evento || 'No especificado'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="w-3 h-3" />
                              {asig.hora_entrada} - {asig.hora_salida}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              asig.estado === 'alta' ? 'bg-blue-100 text-blue-700' :
                              asig.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                              asig.estado === 'enviado' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }>
                              {asig.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {valoracion ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="font-semibold">{valoracion.puntuacion.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Sin valorar</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="valoraciones">
            <Card className="p-6">
              {valoraciones.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Star className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No hay valoraciones registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {valoraciones.map(val => (
                    <div key={val.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-slate-800">{val.cliente}</p>
                          <p className="text-sm text-slate-500">
                            {val.fecha_evento ? format(new Date(val.fecha_evento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          <span className="text-xl font-bold text-slate-800">{val.puntuacion.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Desglose de puntuaciones */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {val.puntualidad && (
                          <div className="text-sm">
                            <span className="text-slate-500">Puntualidad:</span>
                            <span className="font-semibold ml-1">{val.puntualidad}/5</span>
                          </div>
                        )}
                        {val.profesionalidad && (
                          <div className="text-sm">
                            <span className="text-slate-500">Profesionalidad:</span>
                            <span className="font-semibold ml-1">{val.profesionalidad}/5</span>
                          </div>
                        )}
                        {val.actitud && (
                          <div className="text-sm">
                            <span className="text-slate-500">Actitud:</span>
                            <span className="font-semibold ml-1">{val.actitud}/5</span>
                          </div>
                        )}
                      </div>

                      {val.comentario && (
                        <div className="bg-slate-50 rounded p-3 text-sm text-slate-600">
                          <p className="italic">"{val.comentario}"</p>
                          {val.coordinador && (
                            <p className="text-xs text-slate-500 mt-2">- {val.coordinador}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="disponibilidad">
            <Card className="p-6">
              {disponibilidades.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No hay registros de disponibilidad</p>
                  <Link to={createPageUrl('Disponibilidad')}>
                    <Button className="mt-4">Gestionar Disponibilidad</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {disponibilidades.map(disp => (
                    <div key={disp.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {disp.fecha ? format(new Date(disp.fecha), 'dd MMMM yyyy', { locale: es }) : 'N/A'}
                          </p>
                          {disp.hora_inicio && disp.hora_fin && (
                            <p className="text-sm text-slate-500">
                              {disp.hora_inicio} - {disp.hora_fin}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={
                        disp.tipo === 'disponible' ? 'bg-emerald-100 text-emerald-700' :
                        disp.tipo === 'parcial' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {disp.tipo}
                      </Badge>
                      {disp.motivo && (
                        <p className="text-sm text-slate-500 ml-4">{disp.motivo}</p>
                      )}
                    </div>
                  ))}
                  <Link to={createPageUrl('Disponibilidad')}>
                    <Button variant="outline" className="w-full mt-4">
                      Gestionar Disponibilidad
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card className="p-6">
              <GestionDocumentosCamarero camarero={camarero} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}