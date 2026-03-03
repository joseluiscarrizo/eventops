import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from 'lucide-react';
import { toast } from 'sonner';

const StarRating = ({ value, onChange, label }) => {
  const handleClick = (star) => {
    onChange(star);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            className="focus:outline-none hover:scale-110 transition-transform p-1 rounded"
          >
            <Star
              className={`w-7 h-7 transition-colors cursor-pointer ${
                star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-slate-400'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-600 self-center">
          {value}/5
        </span>
      </div>
    </div>
  );
};

export default function ValoracionCamarero({ open, onClose, camarero, pedido }) {
  const [puntuacion, setPuntuacion] = useState(5);
  const [puntualidad, setPuntualidad] = useState(5);
  const [profesionalidad, setProfesionalidad] = useState(5);
  const [actitud, setActitud] = useState(5);
  const [comentario, setComentario] = useState('');
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
        comentario,
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
      toast.success('Valoración guardada');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    valorarMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Valorar a {camarero?.nombre}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-50 p-3 rounded-lg text-sm">
            <p><strong>Evento:</strong> {pedido?.cliente}</p>
            <p><strong>Fecha:</strong> {pedido?.dia}</p>
          </div>

          <StarRating value={puntuacion} onChange={setPuntuacion} label="Puntuación General" />
          <StarRating value={puntualidad} onChange={setPuntualidad} label="Puntualidad" />
          <StarRating value={profesionalidad} onChange={setProfesionalidad} label="Profesionalidad" />
          <StarRating value={actitud} onChange={setActitud} label="Actitud" />

          <div>
            <Label className="text-sm text-slate-600">Comentario (opcional)</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Observaciones sobre el desempeño..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm text-slate-600">Coordinador (opcional)</Label>
            <Input
              value={coordinador}
              onChange={(e) => setCoordinador(e.target.value)}
              placeholder="Tu nombre"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={valorarMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {valorarMutation.isPending ? 'Guardando...' : 'Guardar Valoración'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}