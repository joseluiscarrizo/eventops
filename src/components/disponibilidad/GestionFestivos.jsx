import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Palmtree, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const tiposFestivo = [
  { value: 'nacional', label: 'Nacional', color: 'bg-red-100 text-red-700' },
  { value: 'autonomico', label: 'Autonómico', color: 'bg-orange-100 text-orange-700' },
  { value: 'local', label: 'Local', color: 'bg-blue-100 text-blue-700' },
  { value: 'empresa', label: 'Empresa', color: 'bg-purple-100 text-purple-700' }
];

export default function GestionFestivos({ festivos }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '',
    nombre: '',
    tipo: 'nacional',
    afecta_todos: true
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Festivo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivos'] });
      setOpen(false);
      setFormData({ fecha: '', nombre: '', tipo: 'nacional', afecta_todos: true });
      toast.success('Festivo añadido');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Festivo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivos'] });
      toast.success('Festivo eliminado');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const festivosOrdenados = [...festivos].sort((a, b) => 
    new Date(a.fecha) - new Date(b.fecha)
  );

  return (
    <Card className="bg-white shadow-lg border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-purple-500" />
          Festivos
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
              <Plus className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Festivo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre del Festivo</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Día de la Hispanidad"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposFestivo.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="afecta_todos"
                  checked={formData.afecta_todos}
                  onCheckedChange={(v) => setFormData({ ...formData, afecta_todos: v })}
                />
                <Label htmlFor="afecta_todos" className="cursor-pointer">
                  Afecta a todos los camareros
                </Label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[200px]">
        {festivosOrdenados.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay festivos registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {festivosOrdenados.map(festivo => {
              const tipoConfig = tiposFestivo.find(t => t.value === festivo.tipo);
              return (
                <div 
                  key={festivo.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">
                        {format(new Date(festivo.fecha), 'd')}
                      </p>
                      <p className="text-xs text-slate-500 uppercase">
                        {format(new Date(festivo.fecha), 'MMM', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{festivo.nombre}</p>
                      <Badge className={`text-xs mt-1 ${tipoConfig?.color}`}>
                        {tipoConfig?.label}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(festivo.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}