import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracionRecordatorios() {
  const [formData, setFormData] = useState({
    recordatorio_24h_activo: true,
    recordatorio_24h_horas: 24,
    recordatorio_2h_activo: true,
    recordatorio_2h_horas: 2,
    coordinador_id: '',
    mensaje_24h_template: '🔔 Recordatorio: Mañana tienes servicio confirmado',
    mensaje_2h_template: '⏰ Recordatorio Final: Tu servicio es en 2 horas'
  });

  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-recordatorios'],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracionRecordatorios.list();
      return configs[0] || null;
    }
  });

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  useEffect(() => {
    if (config) {
      setFormData({
        recordatorio_24h_activo: config.recordatorio_24h_activo ?? true,
        recordatorio_24h_horas: config.recordatorio_24h_horas ?? 24,
        recordatorio_2h_activo: config.recordatorio_2h_activo ?? true,
        recordatorio_2h_horas: config.recordatorio_2h_horas ?? 2,
        coordinador_id: config.coordinador_id || '',
        mensaje_24h_template: config.mensaje_24h_template || '🔔 Recordatorio: Mañana tienes servicio confirmado',
        mensaje_2h_template: config.mensaje_2h_template || '⏰ Recordatorio Final: Tu servicio es en 2 horas'
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config) {
        return base44.entities.ConfiguracionRecordatorios.update(config.id, data);
      } else {
        return base44.entities.ConfiguracionRecordatorios.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-recordatorios'] });
      toast.success('Configuración guardada correctamente');
    },
    onError: () => {
      toast.error('Error al guardar la configuración');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Clock className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-[#1e3a5f]" />
        <h2 className="text-xl font-semibold text-slate-800">
          Configuración de Recordatorios Automáticos
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Coordinador desde el que se envían */}
        <div className="space-y-2">
          <Label>Enviar recordatorios desde el número de:</Label>
          <Select 
            value={formData.coordinador_id} 
            onValueChange={(v) => setFormData({ ...formData, coordinador_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un coordinador" />
            </SelectTrigger>
            <SelectContent>
              {coordinadores.map(coord => (
                <SelectItem key={coord.id} value={coord.id}>
                  {coord.nombre} {coord.telefono ? `(${coord.telefono})` : '(Sin teléfono)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.coordinador_id && !coordinadores.find(c => c.id === formData.coordinador_id)?.telefono && (
            <p className="text-xs text-red-500">⚠️ Este coordinador no tiene teléfono configurado</p>
          )}
        </div>

        {/* Recordatorio 24h */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="rec24h" className="text-base font-medium">
              Recordatorio 24 horas antes
            </Label>
            <Switch
              id="rec24h"
              checked={formData.recordatorio_24h_activo}
              onCheckedChange={(v) => setFormData({ ...formData, recordatorio_24h_activo: v })}
            />
          </div>

          {formData.recordatorio_24h_activo && (
            <div className="space-y-3 pl-4 border-l-2 border-emerald-200">
              <div className="space-y-2">
                <Label>Horas antes del servicio</Label>
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={formData.recordatorio_24h_horas}
                  onChange={(e) => setFormData({ ...formData, recordatorio_24h_horas: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recordatorio 2h */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="rec2h" className="text-base font-medium">
              Recordatorio 2 horas antes (Final)
            </Label>
            <Switch
              id="rec2h"
              checked={formData.recordatorio_2h_activo}
              onCheckedChange={(v) => setFormData({ ...formData, recordatorio_2h_activo: v })}
            />
          </div>

          {formData.recordatorio_2h_activo && (
            <div className="space-y-3 pl-4 border-l-2 border-orange-200">
              <div className="space-y-2">
                <Label>Horas antes del servicio</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={formData.recordatorio_2h_horas}
                  onChange={(e) => setFormData({ ...formData, recordatorio_2h_horas: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="submit" 
            disabled={saveMutation.isPending || !formData.coordinador_id}
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </Button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Información:</strong> Los recordatorios se envían automáticamente por WhatsApp a los camareros con servicios confirmados. 
          El sistema verifica cada minuto si hay asignaciones que requieren recordatorio.
        </p>
      </div>
    </Card>
  );
}