import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import HabilidadesEditor from '../camareros/HabilidadesEditor';

const tiposPerfil = [
  { value: 'camarero', label: 'Camarero', prefix: 'CAM' },
  { value: 'cocinero', label: 'Cocinero', prefix: 'COC' },
  { value: 'ayudante_cocina', label: 'Ayudante de cocina', prefix: 'AYU' },
  { value: 'pica', label: 'Pica', prefix: 'PIC' },
  { value: 'jamonero', label: 'Jamonero', prefix: 'JAM' },
  { value: 'coctelero', label: 'Coctelero', prefix: 'EXT' },
];

const especialidades = [
  { value: 'general', label: 'General' },
  { value: 'cocteleria', label: 'Coctelería' },
  { value: 'banquetes', label: 'Banquetes' },
  { value: 'eventos_vip', label: 'Eventos VIP' },
  { value: 'buffet', label: 'Buffet' }
];

const nivelesExperiencia = [
  { value: 'junior', label: 'Junior (0-2 años)' },
  { value: 'intermedio', label: 'Intermedio (2-5 años)' },
  { value: 'senior', label: 'Senior (5-10 años)' },
  { value: 'experto', label: 'Experto (10+ años)' }
];

export default function GestionCamareros({ open, onOpenChange, editingCamarero }) {
  const [tipoPerfil, setTipoPerfil] = useState('camarero');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    telefono: '',
    email: '',
    disponible: true,
    en_reserva: false,
    tallas_camisa: '',
    especialidad: 'general',
    habilidades: [],
    idiomas: [],
    certificaciones: [],
    experiencia_anios: 0,
    notas: '',
    coordinador_id: ''
  });

  const queryClient = useQueryClient();

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('codigo')
  });

  React.useEffect(() => {
    if (editingCamarero) {
      // Detectar tipo de perfil por prefijo del código
      const codigo = editingCamarero.codigo || '';
      const perfilDetectado = tiposPerfil.find(t => codigo.startsWith(t.prefix)) || tiposPerfil[0];
      setTipoPerfil(perfilDetectado.value);
      setFormData({
        ...editingCamarero,
        habilidades: editingCamarero.habilidades || [],
        idiomas: editingCamarero.idiomas || [],
        certificaciones: editingCamarero.certificaciones || [],
        coordinador_id: editingCamarero.coordinador_id || '',
        nivel_experiencia: editingCamarero.nivel_experiencia || 'intermedio'
      });
    } else {
      setTipoPerfil('camarero');
      setFormData({
        codigo: '',
        nombre: '',
        telefono: '',
        email: '',
        disponible: true,
        en_reserva: false,
        tallas_camisa: '',
        especialidad: 'general',
        nivel_experiencia: 'intermedio',
        habilidades: [],
        idiomas: [],
        certificaciones: [],
        experiencia_anios: 0,
        notas: '',
        coordinador_id: ''
      });
    }
  }, [editingCamarero, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Camarero.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      onOpenChange(false);
      toast.success('Camarero añadido');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Camarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      onOpenChange(false);
      toast.success('Camarero actualizado');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let dataToSubmit = { ...formData };
    
    // Generar código automático si es nuevo perfil
    if (!editingCamarero) {
      const perfilSeleccionado = tiposPerfil.find(t => t.value === tipoPerfil) || tiposPerfil[0];
      const prefix = perfilSeleccionado.prefix;
      const maxCodigo = camareros.reduce((max, c) => {
        if (c.codigo && c.codigo.startsWith(prefix)) {
          const num = parseInt(c.codigo.substring(prefix.length));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      dataToSubmit.codigo = `${prefix}${String(maxCodigo + 1).padStart(3, '0')}`;
    }
    
    if (editingCamarero) {
      updateMutation.mutate({ id: editingCamarero.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingCamarero ? 'Editar Perfil' : 'Nuevo Perfil'}
            {editingCamarero?.valoracion_promedio > 0 && (
              <span className="flex items-center gap-1 text-sm font-normal text-amber-600">
                <Star className="w-4 h-4 fill-amber-400" />
                {editingCamarero.valoracion_promedio.toFixed(1)}
                <span className="text-slate-400">({editingCamarero.total_valoraciones})</span>
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="info">Información Básica</TabsTrigger>
              <TabsTrigger value="skills">Habilidades</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {/* Selector de tipo de perfil */}
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-semibold">Tipo de Perfil *</Label>
                  <Select value={tipoPerfil} onValueChange={setTipoPerfil} disabled={!!editingCamarero}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposPerfil.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Código {editingCamarero ? 'actual' : 'asignado'}</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f] bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {editingCamarero ? formData.codigo : (() => {
                      const perfilSeleccionado = tiposPerfil.find(t => t.value === tipoPerfil) || tiposPerfil[0];
                      const prefix = perfilSeleccionado.prefix;
                      const maxCodigo = camareros.reduce((max, c) => {
                        if (c.codigo && c.codigo.startsWith(prefix)) {
                          const num = parseInt(c.codigo.substring(prefix.length));
                          return Math.max(max, isNaN(num) ? 0 : num);
                        }
                        return max;
                      }, 0);
                      return `${prefix}${String(maxCodigo + 1).padStart(3, '0')}`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Código automático (hidden, replaced above) */}
              {!editingCamarero && false && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código Automático del Camarero</Label>
                </div>
              )}



              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="especialidad">Especialidad</Label>
                  <Select 
                    value={formData.especialidad} 
                    onValueChange={(v) => setFormData({ ...formData, especialidad: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {especialidades.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel_experiencia">Nivel de Experiencia</Label>
                  <Select 
                    value={formData.nivel_experiencia} 
                    onValueChange={(v) => setFormData({ ...formData, nivel_experiencia: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {nivelesExperiencia.map(n => (
                        <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tallas">Talla Camisa</Label>
                  <Input
                    id="tallas"
                    value={formData.tallas_camisa}
                    onChange={(e) => setFormData({ ...formData, tallas_camisa: e.target.value })}
                    placeholder="M, L, XL..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experiencia">Años Experiencia</Label>
                  <Input
                    id="experiencia"
                    type="number"
                    min="0"
                    value={formData.experiencia_anios || ''}
                    onChange={(e) => setFormData({ ...formData, experiencia_anios: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="disponible"
                    checked={formData.disponible}
                    onCheckedChange={(v) => setFormData({ ...formData, disponible: v })}
                  />
                  <Label htmlFor="disponible" className="cursor-pointer">
                    Disponible para asignaciones
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="en_reserva"
                    checked={formData.en_reserva}
                    onCheckedChange={(v) => {
                      // Si se activa en_reserva, incrementar contador
                      const nuevasVeces = v && !formData.en_reserva
                        ? (formData.veces_en_reserva || 0) + 1
                        : (formData.veces_en_reserva || 0);
                      setFormData({ ...formData, en_reserva: v, veces_en_reserva: nuevasVeces });
                    }}
                  />
                  <Label htmlFor="en_reserva" className="cursor-pointer">
                    En Reserva (no aparece en lista activa)
                  </Label>
                </div>
              </div>

              {/* Contadores de incidencias */}
              {editingCamarero && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Cancelaciones &lt;2h</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={formData.cancelaciones_last_minute || 0}
                        onChange={(e) => setFormData({ ...formData, cancelaciones_last_minute: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-xs text-slate-400">veces</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Veces en Reserva</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={formData.veces_en_reserva || 0}
                        onChange={(e) => setFormData({ ...formData, veces_en_reserva: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-xs text-slate-400">veces</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="coordinador">Coordinador Asignado</Label>
                <Select
                  value={formData.coordinador_id}
                  onValueChange={(value) => setFormData({ ...formData, coordinador_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar coordinador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Ninguno</SelectItem>
                    {coordinadores.map(coord => (
                      <SelectItem key={coord.id} value={coord.id}>
                        {coord.nombre} (#{coord.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="skills">
              <HabilidadesEditor
                habilidades={formData.habilidades}
                idiomas={formData.idiomas}
                certificaciones={formData.certificaciones}
                onHabilidadesChange={(h) => setFormData({ ...formData, habilidades: h })}
                onIdiomasChange={(i) => setFormData({ ...formData, idiomas: i })}
                onCertificacionesChange={(c) => setFormData({ ...formData, certificaciones: c })}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
              {editingCamarero ? 'Guardar Cambios' : 'Añadir Camarero'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}