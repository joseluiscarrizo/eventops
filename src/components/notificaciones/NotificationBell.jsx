import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, AlertTriangle, Clock, RefreshCw, Mail, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationService from './NotificationService';
import ConfiguracionNotificaciones from './ConfiguracionNotificaciones';

const prioridadColors = {
  baja: 'bg-slate-100 text-slate-600 border-slate-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  alta: 'bg-amber-100 text-amber-700 border-amber-200',
  urgente: 'bg-red-100 text-red-700 border-red-200'
};

const tipoIcons = {
  estado_cambio: RefreshCw,
  evento_proximo: Clock,
  recordatorio: Bell,
  alerta: AlertTriangle
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastCount, setLastCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: notificaciones = [], isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => base44.entities.Notificacion.list('-created_date', 50),
    refetchInterval: 60000, // Reducido a 60 segundos
    staleTime: 45000
  });

  const noLeidas = notificaciones.filter(n => !n.leida);

  // Detectar nuevas notificaciones y reproducir sonido
  useEffect(() => {
    if (noLeidas.length > lastCount && lastCount > 0) {
      const config = JSON.parse(localStorage.getItem('notif_config') || '{}');
      
      if (config.sonido !== false) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjj8LdjHAU2kdXy0HwzBSF7xvHglUMMEjTp6tCWQQQPU6vj77VqIQUygNLxx4IzBhRpv+7mnE4MDk+o4+6VQhQKRp/g8r5sIQUqgM/y3IwzBhpqvO7imEYLDlCn5O+1ah8GM4HSz8SAMwYTaL/u45ZFDA1PqOPwrmMcBTKA0s7FgDIGEWi+7t+XRQsNT6jj8K1mHwU0gtDLw30zBhFovO7el0QMDFCo4++zaiQFM4HSzsSANAcQabzu55dFDA1PqOPvsmkeByuBzvLaiTYIGWi76+yaTgwNUKjj77RpHAU2jtfyy3ovBSF6xvDdkEALEV60');
        audio.volume = (config.volumen || 50) / 100;
        audio.play().catch(() => {});
      }

      if (config.vibrar !== false && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    setLastCount(noLeidas.length);
  }, [noLeidas.length]);

  const marcarLeidaMutation = useMutation({
    mutationFn: (id) => NotificationService.marcarComoLeida(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
  });

  const marcarTodasMutation = useMutation({
    mutationFn: () => {
      return Promise.all(noLeidas.map(n => NotificationService.marcarComoLeida(n.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
  });

  // Verificar eventos próximos al cargar
  useEffect(() => {
    NotificationService.verificarEventosProximos().then(() => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    });
  }, []);

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-slate-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {noLeidas.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium"
              >
                {noLeidas.length > 9 ? '9+' : noLeidas.length}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Notificaciones</h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowConfig(true)}
              className="h-8 w-8 text-slate-600 hover:text-[#1e3a5f]"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </Button>
            {noLeidas.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => marcarTodasMutation.mutate()}
                className="text-xs text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f]"></div>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notificaciones.map((notif) => {
                const Icon = tipoIcons[notif.tipo] || Bell;
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.leida ? 'bg-blue-50/50' : ''}`}
                    onClick={() => !notif.leida && marcarLeidaMutation.mutate(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${prioridadColors[notif.prioridad]} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notif.leida ? 'text-slate-900' : 'text-slate-600'}`}>
                            {notif.titulo}
                          </p>
                          {!notif.leida && (
                            <span className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(notif.created_date), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </span>
                          {notif.email_enviado && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>

    <ConfiguracionNotificaciones 
      open={showConfig}
      onClose={() => setShowConfig(false)}
    />
  </>
  );
}