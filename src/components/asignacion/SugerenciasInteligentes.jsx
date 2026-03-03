import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Star, MapPin, Award, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function SugerenciasInteligentes({ pedido, onAsignar }) {
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [sugerencias, setSugerencias] = useState(null);

  const generarSugerencias = async () => {
    setCargando(true);
    try {
      const resultado = await base44.functions.invoke('sugerirCamarerosInteligente', {
        pedido_id: pedido.id,
        limite: 15
      });

      setSugerencias(resultado);
      toast.success('Sugerencias generadas con IA');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar sugerencias');
    } finally {
      setCargando(false);
    }
  };

  const getNivelColor = (nivel) => {
    switch (nivel) {
      case 'excelente': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'muy_bueno': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'bueno': return 'bg-violet-100 text-violet-800 border-violet-300';
      case 'aceptable': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getNivelTexto = (nivel) => {
    switch (nivel) {
      case 'excelente': return 'Excelente Match';
      case 'muy_bueno': return 'Muy Bueno';
      case 'bueno': return 'Bueno';
      case 'aceptable': return 'Aceptable';
      default: return 'No Recomendado';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          if (!sugerencias) generarSugerencias();
        }}
        className="border-purple-600 text-purple-600 hover:bg-purple-50"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Sugerencias IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Sugerencias Inteligentes de Camareros
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info del evento */}
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{pedido.cliente}</h3>
                  <p className="text-sm text-slate-600">{pedido.dia} • {pedido.lugar_evento}</p>
                  <p className="text-sm text-slate-500">
                    {pedido.entrada} - {pedido.salida}
                  </p>
                </div>
                {!sugerencias && (
                  <Button
                    onClick={generarSugerencias}
                    disabled={cargando}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {cargando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>

            {/* Resumen y alertas */}
            {sugerencias && (
              <>
                {sugerencias.resumen && (
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-slate-700">{sugerencias.resumen}</p>
                  </Card>
                )}

                {sugerencias.alertas?.length > 0 && (
                  <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        {sugerencias.alertas.map((alerta, idx) => (
                          <p key={idx} className="text-sm text-amber-800">{alerta}</p>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Lista de sugerencias */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top {sugerencias.sugerencias?.length || 0} Candidatos
                  </h4>

                  {sugerencias.sugerencias?.map((sug, idx) => (
                    <Card key={sug.camarero_id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                              #{idx + 1}
                            </div>
                            <div>
                              <h5 className="font-semibold text-lg">{sug.nombre}</h5>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                {sug.camarero?.codigo && (
                                  <span className="font-mono">{sug.camarero.codigo}</span>
                                )}
                                {sug.camarero?.especialidad && (
                                  <Badge variant="outline" className="text-xs">
                                    {sug.camarero.especialidad}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Score y nivel */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-lg">{sug.score}</span>
                              <span className="text-sm text-slate-500">/100</span>
                            </div>
                            <Badge className={getNivelColor(sug.nivel_recomendacion)}>
                              {getNivelTexto(sug.nivel_recomendacion)}
                            </Badge>
                            {sug.disponible ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Disponible
                              </Badge>
                            ) : (
                              <Badge variant="destructive">No Disponible</Badge>
                            )}
                          </div>

                          {/* Razón principal */}
                          <p className="text-sm text-slate-700 mb-3 font-medium">
                            {sug.razon_principal}
                          </p>

                          {/* Datos adicionales */}
                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-600">
                            {sug.camarero?.valoracion_promedio > 0 && (
                              <div className="flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                <span>Valoración: {sug.camarero.valoracion_promedio.toFixed(1)}/5</span>
                              </div>
                            )}
                            {sug.camarero?.experiencia_anios > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>{sug.camarero.experiencia_anios} años exp.</span>
                              </div>
                            )}
                            {sug.camarero?.distancia_km != null && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{sug.camarero.distancia_km.toFixed(1)} km</span>
                              </div>
                            )}
                          </div>

                          {/* Fortalezas */}
                          {sug.fortalezas?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-green-700 mb-1">✓ Fortalezas:</p>
                              <ul className="text-xs text-slate-600 space-y-0.5">
                                {sug.fortalezas.map((f, i) => (
                                  <li key={i}>• {f}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Consideraciones */}
                          {sug.consideraciones?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Consideraciones:</p>
                              <ul className="text-xs text-slate-600 space-y-0.5">
                                {sug.consideraciones.map((c, i) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Botón de asignación */}
                        <div className="flex-shrink-0">
                          <Button
                            onClick={() => {
                              onAsignar(sug.camarero);
                              toast.success(`${sug.nombre} añadido`);
                            }}
                            disabled={!sug.disponible}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Asignar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {!sugerencias && !cargando && (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-4">
                  Genera sugerencias inteligentes basadas en IA
                </p>
                <p className="text-sm text-slate-500">
                  El sistema analizará disponibilidad, experiencia, valoraciones,<br />
                  historial con el cliente y proximidad geográfica
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}