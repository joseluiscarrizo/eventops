import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import useWebPushNotifications from './WebPushService';

export const useNotificationPolling = (camareroId, enabled = true) => {
  const queryClient = useQueryClient();
  const { showNotification, canNotify } = useWebPushNotifications();
  const lastCheckRef = useRef(new Date().toISOString());
  const pollingIntervalRef = useRef(null);
  const isCheckingRef = useRef(false);

  const checkNewNotifications = useCallback(async () => {
    if (!camareroId || !enabled || isCheckingRef.current) return;

    try {
      isCheckingRef.current = true;
      
      // Obtener notificaciones desde la última verificación
      const notificaciones = await base44.entities.NotificacionCamarero.filter({
        camarero_id: camareroId,
        leida: false
      });

      // Filtrar solo las notificaciones nuevas desde lastCheck
      const nuevas = notificaciones.filter(n => {
        const createdDate = n.created_date || '';
        return createdDate > lastCheckRef.current;
      });

      if (nuevas.length > 0) {
        // Actualizar última verificación
        lastCheckRef.current = new Date().toISOString();

        // Invalidar queries para actualizar UI
        queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero', camareroId] });
        queryClient.invalidateQueries({ queryKey: ['asignaciones'] });

        // Mostrar notificaciones
        nuevas.forEach(notif => {
          // Toast siempre visible
          toast.success(notif.titulo, {
            description: notif.mensaje,
            duration: 8000,
            action: notif.tipo === 'nueva_asignacion' ? {
              label: 'Ver',
              onClick: () => globalThis.location.href = '#alertas'
            } : undefined
          });

          // Web Push si está habilitado
          if (canNotify) {
            showNotification(notif.titulo, {
              body: notif.mensaje,
              data: { notificacionId: notif.id }
            });
          }

          // Vibración móvil
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
        });
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [camareroId, enabled, queryClient, showNotification, canNotify]);

  useEffect(() => {
    if (!enabled || !camareroId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Verificación inicial
    checkNewNotifications();

    // Polling cada 10 segundos
    pollingIntervalRef.current = setInterval(checkNewNotifications, 10000);

    // Listener para cuando la página se vuelve visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNewNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [camareroId, enabled, checkNewNotifications]);

  return { checkNewNotifications };
};

export default useNotificationPolling;