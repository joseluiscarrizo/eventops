import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Play, Pause, Trash2, Edit, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from "@/components/ui/checkbox";

export default function EnviosProgramados() {
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    plantilla_id: '',
    destinatarios: [],
    tipo_envio: 'unico',
    fecha_envio: '',
    recurrencia: {
      tipo: 'semanal',
      dias_semana: [],
      hora: '09:00'
    },
    fecha_inicio: '',
    fecha_fin: '',
    mensaje_personalizado: ''
  });
  const [camarerosBusqueda, setCamarerosBusqueda] = useState('');

  const queryClient = useQueryClient();

  const { data: envios = [] } = useQuery({
    queryKey: ['envios-programados'],
    queryFn: () => base44.entities.EnvioProgramado.list('-created_date')
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.filter({ activa: true }, 'nombre')
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.filter({ en_reserva: false }, 'nombre')
  });

  const crearMutation = useMutation({
    mutationFn: (data) => base44.entities.EnvioProgramado.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios-programados'] });
      toast.success('Envío programado creado');
      resetForm();
      setOpen(false);
    }
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EnvioProgramado.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios-programados'] });
      toast.success('Envío actualizado');
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.EnvioProgramado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios-programados'] });
      toast.success('Envío eliminado');
    }
  });

  const resetForm = () => {
    setForm({
      nombre: '',
      plantilla_id: '',
      destinatarios: [],
      tipo_envio: 'unico',
      fecha_envio: '',
      recurrencia: {
        tipo: 'semanal',
        dias_semana: [],
        hora: '09:00'
      },
      fecha_inicio: '',
      fecha_fin: '',
      mensaje_personalizado: ''
    });
    setEditando(null);
  };

  const handleEditar = (envio) => {
    setForm({
      nombre: envio.nombre,
      plantilla_id: envio.plantilla_id || '',
      destinatarios: envio.destinatarios || [],
      tipo_envio: envio.tipo_envio,
      fecha_envio: envio.fecha_envio || '',
      recurrencia: envio.recurrencia || { tipo: 'semanal', dias_semana: [], hora: '09:00' },
      fecha_inicio: envio.fecha_inicio || '',
      fecha_fin: envio.fecha_fin || '',
      mensaje_personalizado: envio.mensaje_personalizado || ''
    });
    setEditando(envio.id);
    setOpen(true);
  };

  const handleGuardar = () => {
    if (!form.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (form.destinatarios.length === 0) {
      toast.error('Selecciona al menos un destinatario');
      return;
    }

    if (form.tipo_envio === 'unico' && !form.fecha_envio) {
      toast.error('Especifica la fecha de envío');
      return;
    }

    if (form.tipo_envio === 'recurrente' && !form.fecha_inicio) {
      toast.error('Especifica la fecha de inicio');
      return;
    }

    if (editando) {
      actualizarMutation.mutate({ id: editando, data: form });
    } else {
      crearMutation.mutate(form);
    }
  };

  const toggleCamarero = (camarero) => {
    const existe = form.destinatarios.find(d => d.camarero_id === camarero.id);
    
    if (existe) {
      setForm({
        ...form,
        destinatarios: form.destinatarios.filter(d => d.camarero_id !== camarero.id)
      });
    } else {
      setForm({
        ...form,
        destinatarios: [...form.destinatarios, {
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          telefono: camarero.telefono
        }]
      });
    }
  };

  const camarerosDisponibles = camareros.filter(c => 
    c.nombre.toLowerCase().includes(camarerosBusqueda.toLowerCase()) ||
    c.telefono?.includes(camarerosBusqueda)
  );

  const toggleDiaSemana = (dia) => {
    const dias = form.recurrencia.dias_semana || [];
    const nuevoDias = dias.includes(dia) 
      ? dias.filter(d => d !== dia)
      : [...dias, dia];
    
    setForm({
      ...form,
      recurrencia: { ...form.recurrencia, dias_semana: nuevoDias }
    });
  };

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const toggleEstado = (envio) => {
    const nuevoEstado = envio.estado === 'activo' ? 'pausado' : 'activo';
    actualizarMutation.mutate({
      id: envio.id,
      data: { ...envio, estado: nuevoEstado }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Envíos Programados</h3>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Envío
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Envío' : 'Nuevo Envío Programado'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nombre del Envío</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Recordatorio semanal"
                />
              </div>

              <div>
                <Label>Tipo de Envío</Label>
                <Select value={form.tipo_envio} onValueChange={(v) => setForm({ ...form, tipo_envio: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unico">Envío Único</SelectItem>
                    <SelectItem value="recurrente">Envío Recurrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.tipo_envio === 'unico' ? (
                <div>
                  <Label>Fecha y Hora de Envío</Label>
                  <Input
                    type="datetime-local"
                    value={form.fecha_envio}
                    onChange={(e) => setForm({ ...form, fecha_envio: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label>Tipo de Recurrencia</Label>
                    <Select 
                      value={form.recurrencia.tipo} 
                      onValueChange={(v) => setForm({ 
                        ...form, 
                        recurrencia: { ...form.recurrencia, tipo: v }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diario</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.recurrencia.tipo === 'semanal' && (
                    <div>
                      <Label>Días de la Semana</Label>
                      <div className="flex gap-2 mt-2">
                        {diasSemana.map((dia, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant={(form.recurrencia.dias_semana || []).includes(index) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDiaSemana(index)}
                          >
                            {dia}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.recurrencia.tipo === 'mensual' && (
                    <div>
                      <Label>Día del Mes</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={form.recurrencia.dia_mes || ''}
                        onChange={(e) => setForm({
                          ...form,
                          recurrencia: { ...form.recurrencia, dia_mes: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Hora de Envío</Label>
                    <Input
                      type="time"
                      value={form.recurrencia.hora}
                      onChange={(e) => setForm({
                        ...form,
                        recurrencia: { ...form.recurrencia, hora: e.target.value }
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha Inicio</Label>
                      <Input
                        type="date"
                        value={form.fecha_inicio}
                        onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Fecha Fin (opcional)</Label>
                      <Input
                        type="date"
                        value={form.fecha_fin}
                        onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Plantilla de Mensaje</Label>
                <Select value={form.plantilla_id} onValueChange={(v) => setForm({ ...form, plantilla_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla o escribe manual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Mensaje Manual</SelectItem>
                    {plantillas.map(pl => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!form.plantilla_id && (
                <div>
                  <Label>Mensaje Personalizado</Label>
                  <Textarea
                    value={form.mensaje_personalizado}
                    onChange={(e) => setForm({ ...form, mensaje_personalizado: e.target.value })}
                    placeholder="Escribe tu mensaje..."
                    rows={4}
                  />
                </div>
              )}

              <div>
                <Label>Destinatarios ({form.destinatarios.length} seleccionados)</Label>
                <Input
                  placeholder="Buscar camarero..."
                  value={camarerosBusqueda}
                  onChange={(e) => setCamarerosBusqueda(e.target.value)}
                  className="mb-2"
                />
                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {camarerosDisponibles.map(camarero => (
                      <div
                        key={camarero.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                        onClick={() => toggleCamarero(camarero)}
                      >
                        <Checkbox
                          checked={form.destinatarios.some(d => d.camarero_id === camarero.id)}
                          onCheckedChange={() => toggleCamarero(camarero)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{camarero.nombre}</p>
                          <p className="text-xs text-slate-500">{camarero.telefono}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleGuardar}>
                {editando ? 'Guardar Cambios' : 'Crear Envío'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {envios.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            No hay envíos programados. Crea uno nuevo.
          </Card>
        ) : (
          envios.map(envio => (
            <Card key={envio.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{envio.nombre}</h4>
                    <Badge variant={envio.estado === 'activo' ? 'default' : 'secondary'}>
                      {envio.estado}
                    </Badge>
                    <Badge variant="outline">
                      {envio.tipo_envio === 'unico' ? 'Único' : 'Recurrente'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{envio.destinatarios?.length || 0} destinatarios</span>
                    </div>
                    {envio.tipo_envio === 'unico' ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {envio.fecha_envio && format(parseISO(envio.fecha_envio), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{envio.recurrencia?.hora}</span>
                        </div>
                        {envio.recurrencia?.tipo === 'semanal' && (
                          <span>
                            {(envio.recurrencia.dias_semana || []).map(d => diasSemana[d]).join(', ')}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {envio.proximo_envio && (
                    <p className="text-xs text-slate-500">
                      Próximo envío: {format(parseISO(envio.proximo_envio), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  )}
                  
                  {envio.total_enviados > 0 && (
                    <p className="text-xs text-slate-500">
                      Total enviados: {envio.total_enviados}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEstado(envio)}
                    disabled={actualizarMutation.isPending}
                  >
                    {envio.estado === 'activo' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditar(envio)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('¿Eliminar este envío programado?')) {
                        eliminarMutation.mutate(envio.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}