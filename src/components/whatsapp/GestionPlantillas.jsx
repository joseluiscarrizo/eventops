import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Edit, Star } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function GestionPlantillas() {
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    contenido: '',
    tipo: 'general',
    es_predeterminada: false
  });

  const queryClient = useQueryClient();

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.list('nombre')
  });

  const crearMutation = useMutation({
    mutationFn: (data) => base44.entities.PlantillaWhatsApp.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-whatsapp'] });
      toast.success('Plantilla creada');
      resetForm();
      setOpen(false);
    }
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlantillaWhatsApp.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-whatsapp'] });
      toast.success('Plantilla actualizada');
      resetForm();
      setOpen(false);
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.PlantillaWhatsApp.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-whatsapp'] });
      toast.success('Plantilla eliminada');
    }
  });

  const resetForm = () => {
    setForm({
      nombre: '',
      descripcion: '',
      contenido: '',
      tipo: 'general',
      es_predeterminada: false
    });
    setEditando(null);
  };

  const handleEditar = (plantilla) => {
    setForm({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      contenido: plantilla.contenido,
      tipo: plantilla.tipo || 'general',
      es_predeterminada: plantilla.es_predeterminada || false
    });
    setEditando(plantilla.id);
    setOpen(true);
  };

  const handleGuardar = () => {
    if (!form.nombre || !form.contenido) {
      toast.error('Nombre y contenido son obligatorios');
      return;
    }

    if (editando) {
      actualizarMutation.mutate({ id: editando, data: form });
    } else {
      crearMutation.mutate(form);
    }
  };

  const camposDinamicos = [
    '{{cliente}}', '{{dia}}', '{{lugar_evento}}', '{{hora_entrada}}', 
    '{{hora_salida}}', '{{camisa}}', '{{link_confirmar}}', '{{link_rechazar}}', 
    '{{link_ubicacion}}', '{{camarero_nombre}}'
  ];

  return (
    <div>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Plantillas
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Plantilla' : 'Gestionar Plantillas'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {!editando && plantillas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No hay plantillas creadas. Crea una nueva.
              </div>
            ) : null}

            {!editando && plantillas.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {plantillas.map(plantilla => (
                  <Card key={plantilla.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{plantilla.nombre}</h4>
                          {plantilla.es_predeterminada && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {plantilla.tipo}
                          </Badge>
                        </div>
                        {plantilla.descripcion && (
                          <p className="text-sm text-slate-500 mt-1">{plantilla.descripcion}</p>
                        )}
                        <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-3">
                            {plantilla.contenido}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Creada: {format(new Date(plantilla.created_date), 'dd/MM/yyyy', { locale: es })}</span>
                          {plantilla.activa ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Activa</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactiva</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditar(plantilla)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (confirm('¿Eliminar esta plantilla?')) {
                              eliminarMutation.mutate(plantilla.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            ) : null}

            {(editando || plantillas.length === 0) && (
              <div className="space-y-4">
                <div>
                  <Label>Nombre de la Plantilla</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Confirmación Estándar"
                  />
                </div>

                <div>
                  <Label>Descripción (opcional)</Label>
                  <Input
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="¿Cuándo usar esta plantilla?"
                  />
                </div>

                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmacion">Confirmación</SelectItem>
                      <SelectItem value="recordatorio">Recordatorio</SelectItem>
                      <SelectItem value="cambio">Cambio de Horario</SelectItem>
                      <SelectItem value="cancelacion">Cancelación</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contenido del Mensaje</Label>
                  <Textarea
                    value={form.contenido}
                    onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                    placeholder="Usa campos dinámicos como {{cliente}}, {{dia}}, etc."
                    rows={10}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Campos disponibles: {camposDinamicos.join(', ')}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.es_predeterminada}
                      onChange={(e) => setForm({ ...form, es_predeterminada: e.target.checked })}
                      id="predeterminada"
                    />
                    <Label htmlFor="predeterminada">Usar como plantilla predeterminada</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.activa !== false}
                      onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                      id="activa"
                    />
                    <Label htmlFor="activa">Plantilla activa</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
              {editando ? 'Cancelar' : 'Cerrar'}
            </Button>
            <div className="flex gap-2">
              {editando && (
                <Button variant="outline" onClick={resetForm}>
                  Crear Nueva
                </Button>
              )}
              {(editando || plantillas.length === 0) && (
                <Button onClick={handleGuardar}>
                  <Plus className="w-4 h-4 mr-2" />
                  {editando ? 'Guardar Cambios' : 'Crear Plantilla'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}