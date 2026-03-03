// Helper para enviar notificaciones push desde cualquier componente

export const enviarNotificacionPush = (tipo, titulo, mensaje, opciones = {}) => {
  // Verificar si el usuario tiene notificaciones habilitadas
  const config = JSON.parse(localStorage.getItem('notif_config') || '{"habilitadas": false}');
  
  if (!config.habilitadas || config[tipo] === false) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Configurar opciones según el tipo
    const tipoConfig = {
      nuevasAsignaciones: {
        icon: '📋',
        urgente: false,
        tag: 'nueva-asignacion'
      },
      recordatorios: {
        icon: '⏰',
        urgente: false,
        tag: 'recordatorio'
      },
      cambiosEstado: {
        icon: '🔄',
        urgente: false,
        tag: 'cambio-estado'
      },
      mensajesImportantes: {
        icon: '⚠️',
        urgente: true,
        tag: 'mensaje-importante'
      },
      tareasPendientes: {
        icon: '✓',
        urgente: false,
        tag: 'tarea-pendiente'
      },
      alertasUrgentes: {
        icon: '🚨',
        urgente: true,
        tag: 'alerta-urgente'
      }
    };

    const defaultConfig = tipoConfig[tipo] || { icon: '🔔', urgente: false, tag: 'general' };

    // Reproducir sonido si está habilitado
    if (config.sonido) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjj8LdjHAU2kdXy0HwzBSF7xvHglUMMEjTp6tCWQQQPU6vj77VqIQUygNLxx4IzBhRpv+7mnE4MDk+o4+6VQhQKRp/g8r5sIQUqgM/y3IwzBhpqvO7imEYLDlCn5O+1ah8GM4HSz8SAMwYTaL/u45ZFDA1PqOPwrmMcBTKA0s7FgDIGEWi+7t+XRQsNT6jj8K1mHwU0gtDLw30zBhFovO7el0QMDFCo4++zaiQFM4HSzsSANAcQabzu55dFDA1PqOPvsmkeByuBzvLaiTYIGWi76+yaTgwNUKjj77RpHAU2jtfyy3ovBSF6xvDdkEALEV60');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }

    const notification = new Notification(titulo, {
      body: mensaje,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: defaultConfig.urgente ? [300, 100, 300, 100, 300] : [200, 100, 200],
      tag: opciones.tag || defaultConfig.tag,
      renotify: true,
      requireInteraction: defaultConfig.urgente,
      ...opciones
    });

    notification.onclick = () => {
      globalThis.focus();
      if (opciones.onClick) {
        opciones.onClick();
      }
      notification.close();
    };

    // Auto-cerrar después de tiempo variable según urgencia
    const duracion = defaultConfig.urgente ? 30000 : 10000;
    setTimeout(() => notification.close(), duracion);

    return notification;
  } catch (error) {
    console.error('Error enviando notificación push:', error);
    return false;
  }
};

// Verificar si las notificaciones de un tipo están habilitadas
export const notificacionesTipoHabilitadas = (tipo) => {
  const config = JSON.parse(localStorage.getItem('notif_config') || '{"habilitadas": false}');
  return config.habilitadas && config[tipo] !== false;
};

// Verificar si las notificaciones push están disponibles
export const pushDisponible = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};