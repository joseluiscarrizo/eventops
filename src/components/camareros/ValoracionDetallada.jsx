import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Star, ThumbsUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const StarRating = ({ value, onChange, label }) => (
  <div className="space-y-1">
    <Label className="text-sm text-slate-600">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  </div>
);

export default function ValoracionDetallada({ open, onClose, camarero, pedido }) {
  const [puntuacion, setPuntuacion] = useState(5);
  const [puntualidad, setPuntualidad] = useState(5);
  const [profesionalidad, setProfesionalidad] = useState(5);
  const [actitud, setActitud] = useState(5);
  const [presentacion, setPresentacion] = useState(5);
  const [trabajoEquipo, setTrabajoEquipo] = useState(5);
  const [resolucionProblemas, setResolucionProblemas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [aspectosPositivos, setAspectosPosi] = useState('');
  const [areasMejora, setAreasMejora] = useState('');
  const [recomendaria, setRecomendaria] = useState(true);
  const [coordinador, setCoordinador] = useState('');

  const queryClient = useQueryClient();

  const valorarMutation = useMutation({
    mutationFn: async () => {
      // Crear valoración
      await base44.entities.Valoracion.create({
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        pedido_id: pedido.id,
        cliente: pedido.cliente,
        fecha_evento: pedido.dia,
        puntuacion,
        puntualidad,
        profesionalidad,
        actitud,
        presentacion,
        trabajo_equipo: trabajoEquipo,
        resolucion_problemas: resolucionProblemas,
        comentario,
        aspectos_positivos: aspectosPositivos,
        areas_mejora: areasMejora,
        recomendaria,
        coordinador: coordinador || undefined
      });

      // Actualizar promedio del camarero
      const totalActual = camarero.total_valoraciones || 0;
      const promedioActual = camarero.valoracion_promedio || 0;
      const nuevoTotal = totalActual + 1;
      const nuevoPromedio = ((promedioActual * totalActual) + puntuacion) / nuevoTotal;

      await base44.entities.Camarero.update(camarero.id, {
        valoracion_promedio: Math.round(nuevoPromedio * 10) / 10,
        total_valoraciones: nuevoTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      queryClient.invalidateQueries({ queryKey: ['valoraciones'] });
      toast.success('Valoración detallada guardada');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    valorarMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Evaluación Detallada - {camarero?.nombre}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm"><strong>Evento:</strong> {pedido?.cliente}</p>
            <p className="text-sm"><strong>Fecha:</strong> {pedido?.dia}</p>
            <p className="text-sm"><strong>Lugar:</strong> {pedido?.lugar_evento}</p>
          </div>

          {/* Criterios de Evaluación */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 mb-3">Criterios de Evaluación</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StarRating value={puntuacion} onChange={setPuntuacion} label="Puntuación General" />
              <StarRating value={puntualidad} onChange={setPuntualidad} label="Puntualidad" />
              <StarRating value={profesionalidad} onChange={setProfesionalidad} label="Profesionalidad" />
              <StarRating value={actitud} onChange={setActitud} label="Actitud" />
              <StarRating value={presentacion} onChange={setPresentacion} label="Presentación Personal" />
              <StarRating value={trabajoEquipo} onChange={setTrabajoEquipo} label="Trabajo en Equipo" />
              <StarRating value={resolucionProblemas} onChange={setResolucionProblemas} label="Resolución de Problemas" />
            </div>
          </div>

          {/* Feedback Cualitativo */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-slate-600 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                Aspectos Positivos
              </Label>
              <Textarea
                value={aspectosPositivos}
                onChange={(e) => setAspectosPosi(e.target.value)}
                placeholder="¿Qué hizo especialmente bien?"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Áreas de Mejora
              </Label>
              <Textarea
                value={areasMejora}
                onChange={(e) => setAreasMejora(e.target.value)}
                placeholder="¿Qué aspectos podría mejorar?"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm text-slate-600">Comentario General (opcional)</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Observaciones adicionales sobre el desempeño..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Recomendación */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <Switch
              id="recomendaria"
              checked={recomendaria}
              onCheckedChange={setRecomendaria}
            />
            <Label htmlFor="recomendaria" className="cursor-pointer flex-1">
              <span className="font-medium">¿Recomendarías a este camarero para futuros eventos?</span>
              <p className="text-xs text-slate-500 mt-1">
                Esta información ayuda a mejorar las asignaciones futuras
              </p>
            </Label>
          </div>

          <div>
            <Label className="text-sm text-slate-600">Coordinador/Evaluador (opcional)</Label>
            <Input
              value={coordinador}
              onChange={(e) => setCoordinador(e.target.value)}
              placeholder="Tu nombre"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={valorarMutation.isPending} className="bg-[#1e3a5f] hover:bg-[#152a45]">
              Guardar Evaluación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}