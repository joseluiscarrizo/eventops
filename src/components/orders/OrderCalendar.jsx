import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderCalendar({ orders, assignments, onSelectOrder }) {
  const [current, setCurrent] = useState(new Date());

  // Build a map: order_id -> { total slots needed per profile, confirmed count }
  const orderStatusMap = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const orderAssignments = assignments.filter(a => a.order_id === order.id);
      const confirmedCount = orderAssignments.filter(a => a.status === 'confirmed').length;
      const totalCount = orderAssignments.length;
      // An order is "complete" if it has at least 1 assignment and all are confirmed
      map[order.id] = {
        total: totalCount,
        confirmed: confirmedCount,
        complete: totalCount > 0 && confirmedCount === totalCount,
      };
    });
    return map;
  }, [orders, assignments]);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const ordersByDate = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      if (!order.event_date) return;
      const key = order.event_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(order);
    });
    return map;
  }, [orders]);

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="font-semibold text-gray-800 capitalize">
          {format(current, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setCurrent(subMonths(current, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setCurrent(new Date())}>Hoy</Button>
          <Button size="icon" variant="ghost" onClick={() => setCurrent(addMonths(current, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {dayNames.map(n => (
          <div key={n} className="text-center py-2 text-xs font-medium text-gray-500">{n}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayOrders = ordersByDate[key] || [];
          const isCurrentMonth = isSameMonth(day, current);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className={`min-h-[90px] border-b border-r p-1.5 ${!isCurrentMonth ? "bg-gray-50/60" : ""}`}
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? "bg-indigo-600 text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-300"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayOrders.map(order => {
                  const st = orderStatusMap[order.id];
                  const isComplete = st?.complete;
                  const hasAssignments = st?.total > 0;
                  return (
                    <button
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`w-full text-left text-xs px-1.5 py-1 rounded font-medium truncate flex items-center gap-1 transition-colors
                        ${isComplete
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      title={`${order.order_number} – ${order.event_place}`}
                    >
                      {isComplete
                        ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        : <XCircle className="w-3 h-3 flex-shrink-0" />
                      }
                      <span className="truncate">{order.event_place || order.order_number}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" />Todos confirmados</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block" />Pendiente / incompleto</span>
      </div>
    </div>
  );
}