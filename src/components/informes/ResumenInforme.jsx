import { Card } from "@/components/ui/card";
import { Clock, Users, Building2, CheckCircle } from 'lucide-react';

export default function ResumenInforme({ pedidos }) {
  const totalHoras = pedidos.reduce((sum, p) => sum + (p.t_horas || 0), 0);
  const camareros = [...new Set(pedidos.map(p => p.camarero))].length;
  const clientes = [...new Set(pedidos.map(p => p.cliente))].length;
  const confirmados = pedidos.filter(p => p.confirmado).length;

  const stats = [
    { label: 'Total Registros', value: pedidos.length, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Total Horas', value: `${totalHoras}h`, icon: Clock, color: 'text-[#1e3a5f]', bg: 'bg-[#1e3a5f]/10' },
    { label: 'Camareros', value: camareros, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Clientes', value: clientes, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Confirmados', value: confirmados, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-100' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="p-4 bg-white shadow-sm border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}