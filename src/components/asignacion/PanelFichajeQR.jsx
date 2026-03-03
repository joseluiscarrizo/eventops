/**
 * PanelFichajeQR
 * Panel dentro de la vista de asignación que muestra:
 * - Estado de fichajes de cada camarero (hora entrada/salida real)
 * - Edición manual de entrada/salida por fila independiente
 * - Botón para generar QR del evento y mostrar link en el chat
 * - Vista de QR individual por camarero
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, LogIn, LogOut, Pencil, Check, X, Loader2, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function calcularHoras(entrada, salida) {
  if (!entrada || !salida) return null;
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);
  let minutos = (hS * 60 + mS) - (hE * 60 + mE);
  if (minutos < 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

function FilaFichaje({ asignacion, onUpdate }) {
  const [editando, setEditando] = useState(null); // 'entrada' | 'salida' | null
  const [valorEdit, setValorEdit] = useState('');

  const iniciarEdicion = (campo) => {
    const valor = campo === 'entrada' ? asignacion.hora_entrada_real : asignacion.hora_salida_real;
    setValorEdit(valor || '');
    setEditando(campo);
  };

  const guardar = () => {
    const datos = {};
    if (editando === 'entrada') {
      datos.hora_entrada_real = valorEdit;
      // Recalcular horas si hay salida
      if (asignacion.hora_salida_real) {
        datos.horas_reales = calcularHoras(valorEdit, asignacion.hora_salida_real);
      }
    } else {
      datos.hora_salida_real = valorEdit;
      const entrada = asignacion.hora_entrada_real;
      if (entrada) {
        datos.horas_reales = calcularHoras(entrada, valorEdit);
      }
    }
    onUpdate(asignacion.id, datos);
    setEditando(null);
  };

  const tieneEntrada = !!asignacion.hora_entrada_real;
  const tieneSalida = !!asignacion.hora_salida_real;

  const qrUrl = asignacion.qr_token
    ? `${globalThis.location.origin}/FichajeQR?token=${asignacion.qr_token}`
    : null;

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      {/* Nombre */}
      <div className="w-40 min-w-0">
        <p className="font-medium text-slate-800 truncate text-sm">{asignacion.camarero_nombre}</p>
        <p className="text-xs text-slate-400 font-mono">#{asignacion.camarero_codigo}</p>
      </div>

      {/* Entrada real */}
      <div className="flex items-center gap-1.5 flex-1">
        <LogIn className={`w-3.5 h-3.5 flex-shrink-0 ${tieneEntrada ? 'text-emerald-500' : 'text-slate-300'}`} />
        {editando === 'entrada' ? (
          <div className="flex items-center gap-1">
            <Input
              type="time"
              value={valorEdit}
              onChange={e => setValorEdit(e.target.value)}
              autoFocus
              className="h-7 w-24 text-xs"
            />
            <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700" onClick={guardar}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => iniciarEdicion('entrada')}
            className={`text-sm font-mono flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors ${tieneEntrada ? 'text-emerald-700 font-semibold' : 'text-slate-300'}`}
            title="Editar hora de entrada"
          >
            {tieneEntrada ? asignacion.hora_entrada_real : '--:--'}
            <Pencil className="w-2.5 h-2.5 opacity-50" />
          </button>
        )}
      </div>

      {/* Salida real */}
      <div className="flex items-center gap-1.5 flex-1">
        <LogOut className={`w-3.5 h-3.5 flex-shrink-0 ${tieneSalida ? 'text-blue-500' : 'text-slate-300'}`} />
        {editando === 'salida' ? (
          <div className="flex items-center gap-1">
            <Input
              type="time"
              value={valorEdit}
              onChange={e => setValorEdit(e.target.value)}
              autoFocus
              className="h-7 w-24 text-xs"
            />
            <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700" onClick={guardar}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => iniciarEdicion('salida')}
            className={`text-sm font-mono flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors ${tieneSalida ? 'text-blue-700 font-semibold' : 'text-slate-300'}`}
            title="Editar hora de salida"
          >
            {tieneSalida ? asignacion.hora_salida_real : '--:--'}
            <Pencil className="w-2.5 h-2.5 opacity-50" />
          </button>
        )}
      </div>

      {/* Horas reales */}
      <div className="w-16 text-center">
        {asignacion.horas_reales ? (
          <Badge className="bg-purple-100 text-purple-700 text-xs font-mono">
            {asignacion.horas_reales.toFixed(1)}h
          </Badge>
        ) : (
          <span className="text-slate-300 text-xs">-</span>
        )}
      </div>

      {/* QR link */}
      <div className="w-8">
        {qrUrl && (
          <a href={qrUrl} target="_blank" rel="noopener noreferrer" title="Abrir página de fichaje">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#1e3a5f]">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

export default function PanelFichajeQR({ pedido }) {
  const [generando, setGenerando] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones-fichaje', pedido?.id],
    queryFn: () => base44.entities.AsignacionCamarero.filter({ pedido_id: pedido.id }),
    enabled: !!pedido?.id,
    refetchInterval: 10000
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AsignacionCamarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-fichaje'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Fichaje actualizado');
    }
  });

  const handleUpdate = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const generarQRs = async () => {
    setGenerando(true);
    try {
      const res = await base44.functions.invoke('generarTokensQR', { pedido_id: pedido.id });
      if (res.data.ok) {
        setQrData(res.data);
        setShowDialog(true);
        queryClient.invalidateQueries({ queryKey: ['asignaciones-fichaje'] });
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      } else {
        toast.error('Error al generar QRs');
      }
    } catch (e) {
      toast.error('Error al generar QRs: ' + e.message);
    } finally {
      setGenerando(false);
    }
  };

  const copiarLink = (url) => {
    navigator.clipboard.writeText(globalThis.location.origin + url);
    toast.success('Link copiado');
  };

  const confirmadas = asignaciones.filter(a => a.estado === 'confirmado' || a.estado === 'alta');
  const conQR = confirmadas.filter(a => a.qr_token);
  const totalFichados = asignaciones.filter(a => a.hora_entrada_real).length;

  if (!pedido) return null;

  return (
    <>
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#1e3a5f]" />
              Fichaje por QR
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalFichados}/{asignaciones.length} fichados · Edición manual por fila
            </p>
          </div>
          <Button
            onClick={generarQRs}
            disabled={generando || confirmadas.length === 0}
            size="sm"
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
          >
            {generando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
            {conQR.length > 0 ? 'Ver / Regenerar QRs' : 'Generar QRs'}
          </Button>
        </div>

        {confirmadas.length === 0 && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>No hay camareros confirmados aún. Los QRs se generan cuando el estado es "Confirmado" o "Alta".</span>
          </div>
        )}

        {/* Tabla de fichajes */}
        {asignaciones.length > 0 && (
          <div>
            {/* Cabecera */}
            <div className="flex items-center gap-3 pb-2 border-b text-xs text-slate-400 font-semibold uppercase tracking-wide">
              <div className="w-40">Camarero</div>
              <div className="flex-1 flex items-center gap-1.5"><LogIn className="w-3 h-3" /> Entrada real</div>
              <div className="flex-1 flex items-center gap-1.5"><LogOut className="w-3 h-3" /> Salida real</div>
              <div className="w-16 text-center">Horas</div>
              <div className="w-8"></div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              asignaciones.map(asig => (
                <FilaFichaje
                  key={asig.id}
                  asignacion={asig}
                  onUpdate={handleUpdate}
                />
              ))
            )}
          </div>
        )}
      </Card>

      {/* Dialog con QRs */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Links de Fichaje QR
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Comparte estos links con cada camarero o copia el link del evento para enviarlo en el chat grupal.
            </p>

            {/* Link general del evento */}
            {qrData?.evento_fichaje_url && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">🔗 Link del evento (para el chat grupal)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white rounded px-2 py-1 border truncate">
                    {globalThis.location.origin}/FichajeQR?pedido_id={pedido.id}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => copiarLink(qrData.evento_fichaje_url)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* QR por camarero */}
            {qrData?.asignaciones?.map((asig, i) => (
              <div key={i} className="border rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center font-bold text-[#1e3a5f] text-sm">
                  {asig.camarero_nombre?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{asig.camarero_nombre}</p>
                  <code className="text-xs text-slate-400 truncate block">{asig.qr_url}</code>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => copiarLink(asig.qr_url)}
                    title="Copiar link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <a href={asig.qr_url} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Abrir">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}