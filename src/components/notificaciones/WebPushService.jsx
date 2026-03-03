import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Sonidos de notificación
const SONIDOS = {
  default: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjj8LdjHAU2kdXy0HwzBSF7xvHglUMMEjTp6tCWQQQPU6vj77VqIQUygNLxx4IzBhRpv+7mnE4MDk+o4+6VQhQKRp/g8r5sIQUqgM/y3IwzBhpqvO7imEYLDlCn5O+1ah8GM4HSz8SAMwYTaL/u45ZFDA1PqOPwrmMcBTKA0s7FgDIGEWi+7t+XRQsNT6jj8K1mHwU0gtDLw30zBhFovO7el0QMDFCo4++zaiQFM4HSzsSANAcQabzu55dFDA1PqOPvsmkeByuBzvLaiTYIGWi76+yaTgwNUKjj77RpHAU2jtfyy3ovBSF6xvDdkEALEV60',
  suave: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a',
  alerta: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivr',
  campana: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ',
  silencioso: null
};

const verificarNoMolestar = (preferencias) => {
  if (!preferencias?.no_molestar_habilitado) return false;

  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const diaActual = ahora.getDay();

  // Verificar si hoy está en los días de no molestar
  if (!preferencias.no_molestar_dias?.includes(diaActual)) return false;

  // Convertir horas a minutos
  const [inicioH, inicioM] = (preferencias.no_molestar_inicio || '22:00').split(':').map(Number);
  const [finH, finM] = (preferencias.no_molestar_fin || '08:00').split(':').map(Number);
  const inicio = inicioH * 60 + inicioM;
  const fin = finH * 60 + finM;

  // Si el rango cruza medianoche
  if (inicio > fin) {
    return horaActual >= inicio || horaActual < fin;
  }
  
  return horaActual >= inicio && horaActual < fin;
};

export const useWebPushNotifications = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [preferencias, setPreferencias] = useState(null);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }

    // Cargar preferencias del usuario
    const cargarPreferencias = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.id) {
          const prefs = await base44.entities.PreferenciasNotificacion.filter({ user_id: user.id });
          if (prefs.length > 0) {
            setPreferencias(prefs[0]);
          }
        }
      } catch (error) {
        console.error('Error cargando preferencias:', error);
      }
    };

    cargarPreferencias();
  }, []);

  const requestPermission = async () => {
    if (!isSupported || typeof Notification === 'undefined') {
      toast.error('Las notificaciones no están soportadas en este navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('✅ Notificaciones activadas correctamente');
        return true;
      } else {
        toast.error('Permiso de notificaciones denegado');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = async (title, options = {}) => {
    if (!isSupported || permission !== 'granted' || typeof Notification === 'undefined') {
      return;
    }

    try {
      // Obtener preferencias actualizadas
      const user = await base44.auth.me();
      let prefs = preferencias;
      
      if (!prefs && user?.id) {
        const prefsArray = await base44.entities.PreferenciasNotificacion.filter({ user_id: user.id });
        prefs = prefsArray[0];
      }

      if (!prefs?.push_habilitadas) {
        return;
      }

      // Verificar modo no molestar
      const enNoMolestar = verificarNoMolestar(prefs);
      const esUrgente = options.urgente || options.prioridad === 'urgente';

      if (enNoMolestar && !(prefs.permitir_urgentes_no_molestar && esUrgente)) {
        // Guardar en historial pero no mostrar
        if (user?.id) {
          await base44.entities.HistorialNotificacion.create({
            user_id: user.id,
            tipo: options.tipo || 'sistema',
            titulo: title,
            mensaje: options.body || '',
            prioridad: options.prioridad || 'media',
            bloqueada_no_molestar: true,
            pedido_id: options.pedido_id,
            asignacion_id: options.asignacion_id,
            data_adicional: options.data_adicional
          });
        }
        return;
      }

      // Reproducir sonido si está habilitado
      if (prefs?.sonido_habilitado) {
        const tipoSonido = prefs.tipo_sonido || 'default';
        const sonidoUrl = SONIDOS[tipoSonido];
        
        if (sonidoUrl) {
          const audio = new Audio(sonidoUrl);
          audio.volume = prefs.volumen_sonido ?? 0.5;
          audio.play().catch(() => {});
        }
      }

      // Crear notificación
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: prefs?.vibrar_habilitado !== false ? [200, 100, 200] : [],
        tag: options.tag || 'app-notification',
        renotify: true,
        requireInteraction: esUrgente,
        ...options
      });

      notification.onclick = () => {
        globalThis.focus();
        if (options.onClick) {
          options.onClick();
        }
        notification.close();
      };

      // Auto-cerrar después de tiempo variable
      const duracion = esUrgente ? 30000 : 10000;
      setTimeout(() => notification.close(), duracion);

      // Guardar en historial
      if (user?.id) {
        await base44.entities.HistorialNotificacion.create({
          user_id: user.id,
          tipo: options.tipo || 'sistema',
          titulo: title,
          mensaje: options.body || '',
          prioridad: options.prioridad || 'media',
          enviada_push: true,
          pedido_id: options.pedido_id,
          asignacion_id: options.asignacion_id,
          data_adicional: options.data_adicional
        });
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const isAllowed = permission === 'granted' && preferencias?.push_habilitadas !== false;

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    canNotify: permission === 'granted',
    isAllowed,
    preferencias
  };
};

export default useWebPushNotifications;