import { toast } from 'sonner';
import { Bell, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

const tipoConfig = {
  estado_cambio: {
    icon: RefreshCw,
    color: 'text-blue-500',
    bg: 'bg-blue-50'
  },
  evento_proximo: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50'
  },
  recordatorio: {
    icon: Bell,
    color: 'text-purple-500',
    bg: 'bg-purple-50'
  },
  alerta: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50'
  },
  exito: {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50'
  }
};

export const showNotificationToast = (tipo, titulo, mensaje, duracion = 5000) => {
  const config = tipoConfig[tipo] || tipoConfig.recordatorio;
  const Icon = config.icon;

  toast.custom((t) => (
    <div 
      className={`${config.bg} border border-slate-200 rounded-xl shadow-lg p-4 max-w-md animate-in slide-in-from-right`}
    >
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg bg-white shadow-sm ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">{titulo}</p>
          <p className="text-xs text-slate-600 mt-1">{mensaje}</p>
        </div>
      </div>
    </div>
  ), { duration: duracion });
};

export default showNotificationToast;