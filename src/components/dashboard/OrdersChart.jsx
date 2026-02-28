import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_CONFIG = {
  pending:    { label: "Pendiente",    color: "#f59e0b" },
  confirmed:  { label: "Confirmado",   color: "#6366f1" },
  in_progress:{ label: "En curso",     color: "#3b82f6" },
  completed:  { label: "Completado",   color: "#10b981" },
  cancelled:  { label: "Cancelado",    color: "#ef4444" },
};

export default function OrdersChart({ orders, loading }) {
  const data = Object.entries(
    orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: STATUS_CONFIG[status]?.label || status,
    value: count,
    color: STATUS_CONFIG[status]?.color || "#9ca3af",
  }));

  return (
    <div className="bg-white rounded-xl border p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Pedidos por estado</h2>
      {loading ? (
        <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin pedidos</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}