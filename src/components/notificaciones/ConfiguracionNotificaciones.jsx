import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Volume2, AlertTriangle, Settings, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const SONIDOS = [
  { id: 'default', nombre: 'Predeterminado', url: null },
  { id: 'urgente', nombre: 'Urgente', url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjj8LdjHAU2kdXy0HwzBSF7xvHglUMMEjTp6tCWQQQPU6vj77VqIQUygNLxx4IzBhRpv+7mnE4MDk+o4+6VQhQKRp/g8r5sIQUqgM/y3IwzBhpqvO7imEYLDlCn5O+1ah8GM4HSz8SAMwYTaL/u45ZFDA1PqOPwrmMcBTKA0s7FgDIGEWi+7t+XRQsNT6jj8K1mHwU0gtDLw30zBhFovO7el0QMDFCo4++zaiQFM4HSzsSANAcQabzu55dFDA1PqOPvsmkeByuBzvLaiTYIGWi76+yaTgwNUKjj77RpHAU2jtfyy3ovBSF6xvDdkEALEV60' },
  { id: 'suave', nombre: 'Suave', url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjj8LdjHAU2kdXy0HwzBSF7xvHglUMMEjTp6tCWQQQPU6vj77VqIQUygNLxx4IzBhRpv+7mnE4MDk+o4+6VQhQKRp/g8r5sIQUqgM/y3IwzBhpqvO7imEYLDlCn5O+1ah8GM4HSz8SAMwYTaL/u45ZFDA1PqOPwrmMcBTKA0s7FgDIGEWi+7t+XRQsNT6jj8K1mHwU0gtDLw30zBhFovO7el0QMDFCo4++zaiQFM4HSzsSANAcQabzu55dFDA1PqOPvsmkeByuBzvLaiTYIGWi76+yaTgwNUKjj77RpHAU2jtfyy3ovBSF6xvDdkEALEV60' }
];

export default function ConfiguracionNotificaciones({ open, onClose }) {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('notif_config');
    return saved ? JSON.parse(saved) : {
      habilitadas: true,
      sonido: true,
      volumen: 50,
      sonidoSeleccionado: 'default',
      vibrar: true,
      mostrarEnPantalla: true,
      alertasUrgentes: {
        pedidoIncompleto: true,
        asignacionSinConfirmar: true,
        eventoProximo: true
      },
      noMolestar: {
        activo: false,
        horaInicio: '22:00',
        horaFin: '08:00'
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('notif_config', JSON.stringify(config));
  }, [config]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAlertaChange = (tipo, value) => {
    setConfig(prev => ({
      ...prev,
      alertasUrgentes: {
        ...prev.alertasUrgentes,
        [tipo]: value
      }
    }));
  };

  const handleNoMolestarChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      noMolestar: {
        ...prev.noMolestar,
        [field]: value
      }
    }));
  };

  const probarSonido = () => {
    if (!config.sonido) {
      toast.info('Los sonidos están desactivados');
      return;
    }

    const sonido = SONIDOS.find(s => s.id === config.sonidoSeleccionado);
    const audio = new Audio(sonido?.url || SONIDOS[0].url);
    audio.volume = config.volumen / 100;
    audio.play().catch(() => toast.error('Error al reproducir sonido'));
    
    toast.success('Reproduciendo sonido de prueba');
  };

  const [permissionState, setPermissionState] = useState(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [open]);

  const verificarPermisos = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission;
      setPermissionState(currentPermission);
      
      if (currentPermission === 'granted') {
        toast.success('✓ Los permisos están activos ahora');
        handleChange('habilitadas', true);
        
        // Notificación de prueba
        new Notification('¡Notificaciones activadas!', {
          body: 'Ya puedes recibir notificaciones importantes',
          icon: 'https://img.icons8.com/color/96/000000/bell.png'
        });
      } else if (currentPermission === 'denied') {
        toast.error('Aún están bloqueados. Asegúrate de cambiar a "Permitir" en el navegador');
      } else {
        // Si está en 'default', intentar solicitar permisos
        toast.info('Solicitando permisos...');
        await requestNotificationPermission();
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission === 'granted') {
        toast.success('✓ Permisos de notificación otorgados');
        handleChange('habilitadas', true);
        
        // Mostrar notificación de prueba
        new Notification('Notificaciones Activadas', {
          body: 'Ahora recibirás notificaciones importantes',
          icon: 'https://img.icons8.com/color/96/000000/bell.png'
        });
      } else if (permission === 'denied') {
        toast.error('Permisos denegados. Actívalos en la configuración del navegador.');
        handleChange('habilitadas', false);
      } else {
        toast.info('Permisos no otorgados');
        handleChange('habilitadas', false);
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      toast.error('Error al solicitar permisos de notificación');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1e3a5f]" />
            Configuración de Notificaciones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Activar Notificaciones */}
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[#1e3a5f]" />
                  <div>
                    <Label className="text-base font-semibold text-slate-800">
                      Notificaciones del Navegador
                    </Label>
                    <p className="text-sm text-slate-600 mt-1">
                      {permissionState === 'granted' 
                        ? 'Permisos otorgados ✓' 
                        : permissionState === 'denied'
                        ? 'Permisos bloqueados'
                        : 'Sin permisos'}
                    </p>
                  </div>
                </div>
                {permissionState === 'granted' ? (
                  <Switch
                    checked={config.habilitadas}
                    onCheckedChange={(v) => handleChange('habilitadas', v)}
                  />
                ) : (
                  <Button 
                    onClick={requestNotificationPermission} 
                    size="sm"
                    className="bg-[#1e3a5f] hover:bg-[#152a45]"
                  >
                    {permissionState === 'denied' ? '🔒 Bloqueado' : '🔔 Activar'}
                  </Button>
                )}
              </div>

              {/* Instrucciones si está bloqueado */}
              {permissionState === 'denied' && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-500 rounded-full p-2 shrink-0">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-red-900 mb-2 text-base">🔒 Notificaciones bloqueadas</p>
                      <p className="text-red-800 text-sm mb-3 font-medium">
                        Para desbloquear, sigue estos pasos EXACTAMENTE:
                      </p>
                      <div className="bg-white/80 p-3 rounded-lg mb-3 border border-red-200">
                        <ol className="text-sm text-red-900 space-y-2.5 ml-1">
                          <li className="flex items-start gap-2">
                            <span className="font-bold bg-red-100 px-2 py-0.5 rounded">1</span>
                            <span>Haz clic en el <strong className="text-red-700">icono de candado 🔒</strong> o <strong className="text-red-700">info ⓘ</strong> en la barra de direcciones (arriba a la izquierda, junto a la URL)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold bg-red-100 px-2 py-0.5 rounded">2</span>
                            <span>En el menú que aparece, busca <strong className="text-red-700">"Notificaciones"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold bg-red-100 px-2 py-0.5 rounded">3</span>
                            <span>Cambia de <strong className="text-red-700">"Bloquear"</strong> a <strong className="text-green-700">"Permitir"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold bg-red-100 px-2 py-0.5 rounded">4</span>
                            <span><strong className="text-red-700">IMPORTANTE:</strong> Recarga la página completa (F5 o Ctrl+R)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold bg-red-100 px-2 py-0.5 rounded">5</span>
                            <span>Vuelve a abrir esta configuración y verifica</span>
                          </li>
                        </ol>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={verificarPermisos}
                          size="sm"
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          🔄 Verificar Permisos
                        </Button>
                        <Button 
                          onClick={() => globalThis.location.reload()}
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        >
                          🔄 Recargar Página
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Configuración de Sonido */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#1e3a5f]" />
              Sonido
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Reproducir sonido</Label>
                <Switch
                  checked={config.sonido}
                  onCheckedChange={(v) => handleChange('sonido', v)}
                />
              </div>

              {config.sonido && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de sonido</Label>
                    <Select 
                      value={config.sonidoSeleccionado} 
                      onValueChange={(v) => handleChange('sonidoSeleccionado', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SONIDOS.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Volumen</Label>
                      <span className="text-sm text-slate-600">{config.volumen}%</span>
                    </div>
                    <Slider
                      value={[config.volumen]}
                      onValueChange={([v]) => handleChange('volumen', v)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={probarSonido}
                    className="w-full"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Probar Sonido
                  </Button>
                </>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <Label>Vibración</Label>
                <Switch
                  checked={config.vibrar}
                  onCheckedChange={(v) => handleChange('vibrar', v)}
                />
              </div>
            </div>
          </Card>

          {/* Alertas Urgentes */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alertas Urgentes
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <Label className="font-medium text-slate-800">Pedido Incompleto</Label>
                  <p className="text-xs text-slate-600">Faltan camareros por asignar</p>
                </div>
                <Switch
                  checked={config.alertasUrgentes.pedidoIncompleto}
                  onCheckedChange={(v) => handleAlertaChange('pedidoIncompleto', v)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <Label className="font-medium text-slate-800">Asignación Sin Confirmar</Label>
                  <p className="text-xs text-slate-600">Camareros sin confirmar asistencia</p>
                </div>
                <Switch
                  checked={config.alertasUrgentes.asignacionSinConfirmar}
                  onCheckedChange={(v) => handleAlertaChange('asignacionSinConfirmar', v)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <Label className="font-medium text-slate-800">Evento Próximo</Label>
                  <p className="text-xs text-slate-600">Recordatorios de eventos</p>
                </div>
                <Switch
                  checked={config.alertasUrgentes.eventoProximo}
                  onCheckedChange={(v) => handleAlertaChange('eventoProximo', v)}
                />
              </div>
            </div>
          </Card>

          {/* No Molestar */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1e3a5f]" />
              Modo No Molestar
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activar modo no molestar</Label>
                <Switch
                  checked={config.noMolestar.activo}
                  onCheckedChange={(v) => handleNoMolestarChange('activo', v)}
                />
              </div>

              {config.noMolestar.activo && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm">Desde</Label>
                    <input
                      type="time"
                      value={config.noMolestar.horaInicio}
                      onChange={(e) => handleNoMolestarChange('horaInicio', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Hasta</Label>
                    <input
                      type="time"
                      value={config.noMolestar.horaFin}
                      onChange={(e) => handleNoMolestarChange('horaFin', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                toast.success('Configuración guardada');
                onClose();
              }}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}