import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from 'lucide-react';

export default function TurnosEditor({ turnos = [], onChange }) {
  const calcularHoras = (entrada, salida) => {
    if (!entrada || !salida) return 0;
    const [entH, entM] = entrada.split(':').map(Number);
    const [salH, salM] = salida.split(':').map(Number);
    let horas = (salH + salM/60) - (entH + entM/60);
    if (horas < 0) horas += 24;
    return Math.round(horas * 100) / 100;
  };

  const agregarTurno = () => {
    onChange([...turnos, { cantidad_camareros: 1, entrada: '', salida: '', t_horas: 0 }]);
  };

  const eliminarTurno = (index) => {
    onChange(turnos.filter((_, i) => i !== index));
  };

  const actualizarTurno = (index, field, value) => {
    const nuevosTurnos = [...turnos];
    nuevosTurnos[index][field] = value;
    
    // Calcular horas automáticamente si se actualizó entrada o salida
    if (field === 'entrada' || field === 'salida') {
      nuevosTurnos[index].t_horas = calcularHoras(
        nuevosTurnos[index].entrada,
        nuevosTurnos[index].salida
      );
    }
    
    onChange(nuevosTurnos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Turnos y Horarios</Label>
        <Button type="button" variant="outline" size="sm" onClick={agregarTurno}>
          <Plus className="w-4 h-4 mr-1" />
          Agregar Turno
        </Button>
      </div>

      {turnos.length === 0 ? (
        <Card className="p-4 text-center text-slate-500 text-sm">
          No hay turnos agregados. Haz clic en "Agregar Turno" para empezar.
        </Card>
      ) : (
        <div className="space-y-3">
          {turnos.map((turno, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Turno {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => eliminarTurno(index)}
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Camareros</Label>
                  <Input
                    type="number"
                    min="1"
                    value={turno.cantidad_camareros || 1}
                    onChange={(e) => actualizarTurno(index, 'cantidad_camareros', parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entrada</Label>
                  <Input
                    type="time"
                    value={turno.entrada || ''}
                    onChange={(e) => actualizarTurno(index, 'entrada', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Salida</Label>
                  <Input
                    type="time"
                    value={turno.salida || ''}
                    onChange={(e) => actualizarTurno(index, 'salida', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={turno.t_horas || 0}
                    readOnly
                    className="h-9 bg-slate-50"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}