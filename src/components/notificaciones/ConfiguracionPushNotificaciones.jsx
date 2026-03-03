import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Settings, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useWebPushNotifications } from './WebPushService';

const TIPOS_NOTIFICACION = {
  nuevasAsignaciones: {
    label: 'Nuevas Asignaciones',
    description: 'Cuando se te asigna a un nuevo evento',
    icon: '📋',
    prioridad: 'alta'
  },
  recordatorios: {
    label: 'Recordatorios de Eventos',
    description: 'Recordatorios 24h y 2h antes del evento',
    icon: '⏰',
    prioridad: 'media'
  },
  cambiosEstado: {
    label: 'Cambios de Estado',
    description: 'Cuando un evento cambia de estado',
    icon: '🔄',
    prioridad: 'media'
  },
  mensajesImportantes: {
    label: 'Mensajes Importantes',
    description: 'Comunicaciones urgentes del coordinador',
    icon: '⚠️',
    prioridad: 'alta'
  },
  tareasPendientes: {
    label: 'Tareas Pendientes',
    description: 'Recordatorios de tareas por completar',
    icon: '✓',
    prioridad: 'baja'
  },
  alertasUrgentes: {
    label: 'Alertas Urgentes',
    description: 'Notificaciones críticas que requieren acción inmediata',
    icon: '🚨',
    prioridad: 'urgente'
  }
};

export default function ConfiguracionPushNotificaciones() {
  const { permission, requestPermission, showNotification, canNotify } = useWebPushNotifications();
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('notif_config');
    return saved ? JSON.parse(saved) : {
      habilitadas: false,
      sonido: true,
      nuevasAsignaciones: true,
      recordatorios: true,
      cambiosEstado: true,
      mensajesImportantes: true,
      tareasPendientes: true,
      alertasUrgentes: true
    };
  });

  useEffect(() => {
    localStorage.setItem('notif_config', JSON.stringify(config));
  }, [config]);

  const handleActivarNotificaciones = async () => {
    if (permission === 'denied') {
      toast.error('Los permisos fueron denegados. Actívalos desde la configuración del navegador.');
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      setConfig(prev => ({ ...prev, habilitadas: true }));
      showNotification(
        '🔔 Notificaciones Activadas',
        { body: 'Recibirás alertas en tiempo real sobre tus eventos' }
      );
    }
  };

  const handleDesactivar = () => {
    setConfig(prev => ({ ...prev, habilitadas: false }));
    toast.info('Notificaciones desactivadas');
  };

  const toggleTipo = (tipo) => {
    setConfig(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  const testNotification = () => {
    if (!canNotify) {
      toast.error('Primero activa las notificaciones');
      return;
    }
    showNotification(
      '🧪 Notificación de Prueba',
      { body: 'Así se verán tus notificaciones push' }
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración de Notificaciones Push
          </CardTitle>
          <CardDescription>
            Personaliza qué alertas deseas recibir en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estado general */}
          <div className="p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {canNotify ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <p className="font-medium">
                    {canNotify ? 'Notificaciones Activas' : 'Notificaciones Desactivadas'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {permission === 'granted' 
                      ? 'Recibirás alertas en tiempo real'
                      : permission === 'denied'
                      ? 'Permisos denegados - Actívalos en tu navegador'
                      : 'Activa las notificaciones para no perderte ninguna actualización'
                    }
                  </p>
                </div>
              </div>
              {!canNotify ? (
                <Button onClick={handleActivarNotificaciones}>
                  Activar
                </Button>
              ) : (
                <Button variant="outline" onClick={handleDesactivar}>
                  Desactivar
                </Button>
              )}
            </div>
          </div>

          {/* Configuración de sonido */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {config.sonido ? (
                <Volume2 className="w-4 h-4 text-slate-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <Label>Sonido de Notificación</Label>
                <p className="text-xs text-slate-500">Reproducir sonido al recibir alertas</p>
              </div>
            </div>
            <Switch
              checked={config.sonido}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sonido: checked }))}
            />
          </div>

          {/* Tipos de notificaciones */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-slate-700">Tipos de Notificaciones</h4>
            {Object.entries(TIPOS_NOTIFICACION).map(([key, tipo]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tipo.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="cursor-pointer">{tipo.label}</Label>
                      {tipo.prioridad === 'urgente' && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                          Urgente
                        </span>
                      )}
                      {tipo.prioridad === 'alta' && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          Alta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{tipo.description}</p>
                  </div>
                </div>
                <Switch
                  checked={config[key]}
                  onCheckedChange={() => toggleTipo(key)}
                  disabled={!config.habilitadas}
                />
              </div>
            ))}
          </div>

          {/* Botón de prueba */}
          {canNotify && (
            <Button 
              variant="outline" 
              onClick={testNotification}
              className="w-full"
            >
              🧪 Enviar Notificación de Prueba
            </Button>
          )}

          {/* Información adicional */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">💡 Consejo</p>
            <p className="text-xs">
              Las notificaciones push funcionan incluso cuando no tienes la aplicación abierta. 
              Asegúrate de permitir las notificaciones en tu navegador para no perderte ninguna actualización importante.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}