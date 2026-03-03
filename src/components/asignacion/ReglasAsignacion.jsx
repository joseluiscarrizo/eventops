import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Shield, Star, MapPin, Award, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const tiposRegla = [
  { value: 'cliente_preferido', label: 'Cliente Preferido', icon: Star, description: 'Camareros preferidos para cliente específico' },
  { value: 'valoracion_minima', label: 'Valoración Mínima', icon: Star, description: 'Requiere valoración mínima' },
  { value: 'distancia_maxima', label: 'Distancia Máxima', icon: MapPin, description: 'Limita distancia al evento' },
  { value: 'especialidad_obligatoria', label: 'Especialidad Obligatoria', icon: Award, description: 'Requiere especialidad específica' },
  { value: 'experiencia_minima', label: 'Experiencia Mínima', icon: TrendingUp, description: 'Años mínimos de experiencia' },
  { value: 'evitar_eventos_consecutivos', label: 'Evitar Eventos Consecutivos', icon: Shield, description: 'Requiere descanso mínimo entre eventos' },
  { value: 'limite_eventos_mes', label: 'Límite Eventos/Mes', icon: Shield, description: 'Máximo eventos por mes' },
  { value: 'historial_rendimiento', label: 'Historial de Rendimiento', icon: TrendingUp, description: 'Rendimiento mínimo en últimos eventos' }
];

export default function ReglasAsignacion() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [reglaEditando, setReglaEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data: reglas = [] } = useQuery({
    queryKey: ['reglas-asignacion'],
    queryFn: () => base44.entities.ReglaAsignacion.list('-prioridad')
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReglaAsignacion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-asignacion'] });
      toast.success('Regla creada');
      cerrarModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReglaAsignacion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-asignacion'] });
      toast.success('Regla actualizada');
      cerrarModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReglaAsignacion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-asignacion'] });
      toast.success('Regla eliminada');
    }
  });

  const toggleActivaMutation = useMutation({
    mutationFn: ({ id, activa }) => base44.entities.ReglaAsignacion.update(id, { activa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-asignacion'] });
    }
  });

  const abrirModal = (regla = null) => {
    setReglaEditando(regla);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setReglaEditando(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#1e3a5f]" />
            Reglas de Asignación
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Define reglas preferenciales para la asignación automática
          </p>
        </div>
        <Button onClick={() => abrirModal()} className="bg-[#1e3a5f] hover:bg-[#152a45]">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      {/* Tabla de reglas */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Obligatoria</TableHead>
              <TableHead>Bonus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reglas.map(regla => {
              const tipoInfo = tiposRegla.find(t => t.value === regla.tipo_regla);
              const Icon = tipoInfo?.icon || Shield;

              return (
                <TableRow key={regla.id}>
                  <TableCell className="font-medium">{regla.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm">{tipoInfo?.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{regla.prioridad}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={regla.activa}
                      onCheckedChange={(checked) => 
                        toggleActivaMutation.mutate({ id: regla.id, activa: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {regla.es_obligatoria ? (
                      <Badge className="bg-red-100 text-red-700">Sí</Badge>
                    ) : (
                      <span className="text-slate-400 text-sm">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {regla.bonus_puntos > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        +{regla.bonus_puntos}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirModal(regla)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(regla.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {reglas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  No hay reglas configuradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de creación/edición */}
      <FormularioRegla
        open={modalAbierto}
        onClose={cerrarModal}
        regla={reglaEditando}
        clientes={clientes}
        camareros={camareros}
        onSubmit={(data) => {
          if (reglaEditando) {
            updateMutation.mutate({ id: reglaEditando.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function FormularioRegla({ open, onClose, regla, clientes, camareros, onSubmit }) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_regla: 'cliente_preferido',
    activa: true,
    prioridad: 5,
    es_obligatoria: false,
    bonus_puntos: 10,
    penalizacion_puntos: 0,
    cliente_id: '',
    camareros_preferidos: [],
    camareros_excluidos: [],
    valoracion_minima: 4.0,
    distancia_maxima_km: 20,
    especialidades_requeridas: [],
    experiencia_minima_anios: 2,
    horas_descanso_entre_eventos: 8,
    max_eventos_por_mes: 20,
    puntuacion_minima_ultimos_eventos: 4.0,
    cantidad_eventos_historial: 5,
    aplicar_solo_cliente_id: '',
    descripcion: ''
  });

  React.useEffect(() => {
    if (regla) {
      setFormData({ ...regla });
    }
  }, [regla]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const tipoSeleccionado = tiposRegla.find(t => t.value === formData.tipo_regla);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {regla ? 'Editar Regla' : 'Nueva Regla de Asignación'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nombre de la Regla *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: VIP requiere 5 estrellas"
              />
            </div>

            <div>
              <Label>Tipo de Regla *</Label>
              <Select value={formData.tipo_regla} onValueChange={(v) => setFormData({ ...formData, tipo_regla: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposRegla.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoSeleccionado && (
                <p className="text-xs text-slate-500 mt-1">{tipoSeleccionado.description}</p>
              )}
            </div>

            <div>
              <Label>Prioridad (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.activa}
                onCheckedChange={(v) => setFormData({ ...formData, activa: v })}
              />
              <Label>Regla Activa</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.es_obligatoria}
                onCheckedChange={(v) => setFormData({ ...formData, es_obligatoria: v })}
              />
              <Label>Es Obligatoria</Label>
            </div>

            <div>
              <Label>Bonus de Puntos</Label>
              <Input
                type="number"
                min="0"
                value={formData.bonus_puntos}
                onChange={(e) => setFormData({ ...formData, bonus_puntos: parseInt(e.target.value) })}
              />
            </div>

            {/* Campos específicos por tipo */}
            {formData.tipo_regla === 'cliente_preferido' && (
              <>
                <div>
                  <Label>Cliente</Label>
                  <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.tipo_regla === 'valoracion_minima' && (
              <div>
                <Label>Valoración Mínima (1-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.valoracion_minima}
                  onChange={(e) => setFormData({ ...formData, valoracion_minima: parseFloat(e.target.value) })}
                />
              </div>
            )}

            {formData.tipo_regla === 'distancia_maxima' && (
              <div>
                <Label>Distancia Máxima (km)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.distancia_maxima_km}
                  onChange={(e) => setFormData({ ...formData, distancia_maxima_km: parseInt(e.target.value) })}
                />
              </div>
            )}

            {formData.tipo_regla === 'experiencia_minima' && (
              <div>
                <Label>Años Mínimos de Experiencia</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.experiencia_minima_anios}
                  onChange={(e) => setFormData({ ...formData, experiencia_minima_anios: parseInt(e.target.value) })}
                />
              </div>
            )}

            {formData.tipo_regla === 'evitar_eventos_consecutivos' && (
              <div>
                <Label>Horas Mínimas de Descanso</Label>
                <Input
                  type="number"
                  min="4"
                  max="48"
                  value={formData.horas_descanso_entre_eventos}
                  onChange={(e) => setFormData({ ...formData, horas_descanso_entre_eventos: parseInt(e.target.value) })}
                />
                <p className="text-xs text-slate-500 mt-1">Horas mínimas entre eventos consecutivos</p>
              </div>
            )}

            {formData.tipo_regla === 'limite_eventos_mes' && (
              <div>
                <Label>Máximo Eventos por Mes</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.max_eventos_por_mes}
                  onChange={(e) => setFormData({ ...formData, max_eventos_por_mes: parseInt(e.target.value) })}
                />
              </div>
            )}

            {formData.tipo_regla === 'historial_rendimiento' && (
              <>
                <div>
                  <Label>Puntuación Mínima Promedio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.puntuacion_minima_ultimos_eventos}
                    onChange={(e) => setFormData({ ...formData, puntuacion_minima_ultimos_eventos: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Eventos a Considerar</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.cantidad_eventos_historial}
                    onChange={(e) => setFormData({ ...formData, cantidad_eventos_historial: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Últimos N eventos para calcular promedio</p>
                </div>
              </>
            )}

            <div>
              <Label>Penalización de Puntos</Label>
              <Input
                type="number"
                min="0"
                value={formData.penalizacion_puntos}
                onChange={(e) => setFormData({ ...formData, penalizacion_puntos: parseInt(e.target.value) })}
              />
              <p className="text-xs text-slate-500 mt-1">Puntos a restar si no cumple (para reglas opcionales)</p>
            </div>

            <div className="col-span-2">
              <Label>Aplicar Solo a Cliente</Label>
              <Select 
                value={formData.aplicar_solo_cliente_id || 'todos'} 
                onValueChange={(v) => setFormData({ ...formData, aplicar_solo_cliente_id: v === 'todos' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los clientes</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional de la regla"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
              {regla ? 'Actualizar' : 'Crear'} Regla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}