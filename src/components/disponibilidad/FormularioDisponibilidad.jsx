import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Save, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const tiposDisponibilidad = [
  { value: 'disponible', label: 'Disponible', color: 'text-emerald-600' },
  { value: 'no_disponible', label: 'No Disponible', color: 'text-red-600' },
  { value: 'vacaciones', label: 'Vacaciones', color: 'text-blue-600' },
  { value: 'baja', label: 'Baja médica', color: 'text-amber-600' },
  { value: 'parcial', label: 'Disponibilidad Parcial', color: 'text-cyan-600' }
];

const diasSemana = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];

export default function FormularioDisponibilidad({ 
  camarero, 
  selectedDate, 
  existingDisponibilidad,
  onSave, 
  onDelete,
  onClose 
}) {
  const [formData, setFormData] = useState({
    tipo: 'no_disponible',
    hora_inicio: '',
    hora_fin: '',
    motivo: '',
    recurrente: false,
    dia_semana: null
  });

  useEffect(() => {
    if (existingDisponibilidad?.info && existingDisponibilidad.info.camarero_id) {
      const info = existingDisponibilidad.info;
      setFormData({
        tipo: info.tipo || 'no_disponible',
        hora_inicio: info.hora_inicio || '',
        hora_fin: info.hora_fin || '',
        motivo: info.motivo || '',
        recurrente: info.recurrente || false,
        dia_semana: info.dia_semana
      });
    } else {
      setFormData({
        tipo: 'no_disponible',
        hora_inicio: '',
        hora_fin: '',
        motivo: '',
        recurrente: false,
        dia_semana: selectedDate ? selectedDate.getDay() : null
      });
    }
  }, [existingDisponibilidad, selectedDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      fecha: format(selectedDate, 'yyyy-MM-dd'),
      ...formData,
      dia_semana: formData.recurrente ? (formData.dia_semana ?? selectedDate.getDay()) : null
    });
  };

  const canDelete = existingDisponibilidad?.info?.id;

  if (!selectedDate || !camarero) {
    return (
      <Card className="bg-white shadow-lg border-slate-100 p-6">
        <div className="text-center py-8 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Selecciona un camarero y una fecha</p>
          <p className="text-sm mt-1">para gestionar su disponibilidad</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-800">Gestionar Disponibilidad</h3>
          <p className="text-sm text-slate-500 mt-1">
            {camarero.nombre} - {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Disponibilidad</Label>
          <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposDisponibilidad.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  <span className={t.color}>{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.tipo === 'parcial' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Hora Inicio
              </Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Hora Fin
              </Label>
              <Input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Motivo (opcional)</Label>
          <Textarea
            value={formData.motivo}
            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
            placeholder="Ej: Cita médica, compromiso personal..."
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <Switch
            id="recurrente"
            checked={formData.recurrente}
            onCheckedChange={(v) => setFormData({ ...formData, recurrente: v })}
          />
          <div>
            <Label htmlFor="recurrente" className="cursor-pointer">
              Aplicar semanalmente
            </Label>
            <p className="text-xs text-slate-500">
              Se aplicará todos los {diasSemana.find(d => d.value === selectedDate.getDay())?.label}
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          {canDelete && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onDelete(existingDisponibilidad.info.id)}
              className="text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button 
            type="submit" 
            className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </form>
    </Card>
  );
}