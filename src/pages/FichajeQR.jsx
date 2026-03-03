/**
 * FichajeQR - Página pública de fichaje por QR
 * El camarero escanea su QR y ve esta página para registrar entrada/salida.
 * No requiere login.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, LogIn, LogOut, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Logger from '../utils/logger';
import { validateToken } from '../utils/validators';
import ErrorNotificationService from '../utils/errorNotificationService';
import { ValidationError, handleWebhookError } from '../utils/webhookImprovements';

export default function FichajeQR() {
  const urlParams = new URLSearchParams(globalThis.location.search);
  const token = urlParams.get('token');

  // cargando | listo | exito | error | error_leve
  const [estado, setEstado] = useState('cargando');
  const [datos, setDatos] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!validateToken(token)) {
      Logger.error('Token de fichaje inválido o ausente', { token });
      setEstado('error');
      setMensaje('Token no válido. Escanea el código QR correcto.');
      return;
    }
    cargarDatos();
  }, [token]);

  const cargarDatos = async () => {
    setEstado('cargando');
    setMensaje('');
    try {
      const res = await base44.functions.invoke('registrarFichajeQR', { token }, { method: 'GET' });
      if (!res || !res.data) {
        throw new ValidationError('Respuesta de API vacía o inválida');
      }
      const asignacion = res.data.asignacion;
      const pedido = res.data.pedido;
      if (!asignacion) {
        throw new ValidationError('No se encontró la asignación para este token');
      }
      Logger.info('Datos de fichaje cargados correctamente', { token, pedido: !!pedido });
      setDatos(res.data);
      setEstado('listo');
    } catch (e) {
      const mensajeError = e instanceof ValidationError
        ? e.message
        : 'No se pudo cargar la información. Token inválido o expirado.';
      Logger.error('Error al cargar datos de fichaje', { token, error: e?.message });
      ErrorNotificationService.notify(mensajeError);
      setEstado('error');
      setMensaje(mensajeError);
    }
  };

  const validarFichaje = (tipo, asig) => {
    if (!validateToken(token)) return 'Token no válido. No se puede registrar el fichaje.';
    if (tipo !== 'entrada' && tipo !== 'salida') return 'Tipo de fichaje no reconocido.';
    if (tipo === 'salida' && !asig?.hora_entrada_real) return 'Debes registrar la entrada antes de registrar la salida.';
    if (tipo === 'entrada' && asig?.hora_entrada_real) return 'La entrada ya ha sido registrada.';
    if (tipo === 'salida' && asig?.hora_salida_real) return 'La salida ya ha sido registrada.';
    return null;
  };

  const registrarFichaje = async (tipo) => {
    const asig = datos?.asignacion;
    const errorValidacion = validarFichaje(tipo, asig);
    if (errorValidacion) {
      Logger.error('Validación de fichaje fallida', { tipo, error: errorValidacion });
      setMensaje(errorValidacion);
      setEstado('error_leve');
      return;
    }

    Logger.info('Intentando registrar fichaje', { token, tipo });
    setProcesando(true);
    setMensaje('');
    try {
      const res = await base44.functions.invoke('registrarFichajeQR', { token, tipo });
      if (!res || !res.data) {
        throw new Error('Respuesta vacía del servidor');
      }
      if (res.data.ok) {
        const hora = res.data.hora || '';
        const horasTrabajadas = res.data.horas_reales != null ? ` · ${res.data.horas_reales.toFixed(1)}h trabajadas` : '';
        const mensajeExito = tipo === 'entrada'
          ? `✅ Entrada registrada a las ${hora}`
          : `✅ Salida registrada a las ${hora}${horasTrabajadas}`;
        Logger.info('Fichaje registrado correctamente', { tipo, hora });
        setMensaje(mensajeExito);
        setEstado('exito');
        setTimeout(cargarDatos, 1500);
      } else {
        const mensajeError = res.data.error || 'Error al registrar fichaje';
        Logger.warn('Error leve al registrar fichaje', { tipo, error: mensajeError });
        ErrorNotificationService.notify(mensajeError);
        setMensaje(mensajeError);
        setEstado('error_leve');
      }
    } catch (e) {
      const mensajeError = handleWebhookError(e);
      Logger.error('Excepción al registrar fichaje', { tipo, error: e?.message });
      ErrorNotificationService.notify(mensajeError);
      setMensaje(mensajeError);
      setEstado('error_leve');
    } finally {
      setProcesando(false);
    }
  };

  const asig = datos?.asignacion ?? null;
  const pedido = datos?.pedido ?? null;
  const tieneEntrada = !!asig?.hora_entrada_real;
  const tieneSalida = !!asig?.hora_salida_real;
  const tokenValido = validateToken(token);
  const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-bold text-xl">Fichaje de Servicio</h1>
          <p className="text-white/60 text-sm mt-1">{horaActual} · {format(new Date(), 'EEEE d MMM', { locale: es })}</p>
        </div>

        {/* Loading */}
        {estado === 'cargando' && (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500">Cargando datos...</p>
          </Card>
        )}

        {/* Error total */}
        {estado === 'error' && (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <p className="font-semibold text-slate-700 mb-2">Error</p>
            <p className="text-sm text-slate-500">{mensaje}</p>
          </Card>
        )}

        {/* Listo para fichar */}
        {(estado === 'listo' || estado === 'exito' || estado === 'error_leve') && asig && (
          <Card className="overflow-hidden">
            {/* Header camarero */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
                  {asig.camarero_nombre?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="font-bold text-lg">{asig.camarero_nombre ?? 'Camarero'}</p>
                  <p className="text-white/70 text-sm font-mono">#{asig.camarero_codigo ?? '-'}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Info evento */}
              {pedido && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-slate-800">{pedido.cliente ?? '-'}</p>
                  {pedido.lugar_evento && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {pedido.lugar_evento}
                    </div>
                  )}
                  {pedido.dia && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(pedido.dia + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                    </div>
                  )}
                </div>
              )}

              {/* Horario planificado */}
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <p className="text-slate-400 text-xs mb-1">Entrada planificada</p>
                  <p className="font-mono font-semibold text-slate-700">{asig.hora_entrada ?? '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-xs mb-1">Salida planificada</p>
                  <p className="font-mono font-semibold text-slate-700">{asig.hora_salida ?? '-'}</p>
                </div>
              </div>

              {/* Estado de fichajes */}
              <div className="space-y-2">
                <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${tieneEntrada ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-dashed border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <LogIn className={`w-4 h-4 ${tieneEntrada ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">Entrada</span>
                  </div>
                  {tieneEntrada ? (
                    <Badge className="bg-emerald-100 text-emerald-700 font-mono">{asig.hora_entrada_real}</Badge>
                  ) : (
                    <span className="text-xs text-slate-400">No registrada</span>
                  )}
                </div>

                <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${tieneSalida ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-dashed border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <LogOut className={`w-4 h-4 ${tieneSalida ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">Salida</span>
                  </div>
                  {tieneSalida ? (
                    <Badge className="bg-blue-100 text-blue-700 font-mono">{asig.hora_salida_real}</Badge>
                  ) : (
                    <span className="text-xs text-slate-400">No registrada</span>
                  )}
                </div>

                {asig.horas_reales != null && (
                  <div className="text-center pt-1">
                    <Badge className="bg-purple-100 text-purple-700 text-sm px-4">
                      ⏱ {asig.horas_reales.toFixed(1)}h trabajadas
                    </Badge>
                  </div>
                )}
              </div>

              {/* Mensaje de éxito/error */}
              {(estado === 'exito' || estado === 'error_leve') && mensaje && (
                <div className={`rounded-lg p-3 text-sm text-center font-medium ${estado === 'exito' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {mensaje}
                </div>
              )}

              {/* Botones de fichaje */}
              <div className="space-y-2 pt-2">
                {!tieneEntrada && (
                  <Button
                    onClick={() => registrarFichaje('entrada')}
                    disabled={procesando || !tokenValido}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
                  >
                    {procesando ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                    Registrar Entrada
                  </Button>
                )}

                {tieneEntrada && !tieneSalida && (
                  <Button
                    onClick={() => registrarFichaje('salida')}
                    disabled={procesando || !tokenValido}
                    className="w-full bg-[#1e3a5f] hover:bg-[#152a45] h-12 text-base font-semibold"
                  >
                    {procesando ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogOut className="w-5 h-5 mr-2" />}
                    Registrar Salida
                  </Button>
                )}

                {tieneEntrada && tieneSalida && (
                  <div className="text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-emerald-700 font-semibold">Servicio completado</p>
                    <p className="text-slate-500 text-sm">Entrada y salida registradas</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <p className="text-center text-white/40 text-xs mt-6">Staff Coordinator · Fichaje Seguro</p>
      </div>
    </div>
  );
}