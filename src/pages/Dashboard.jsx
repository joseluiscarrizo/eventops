import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { startOfToday, format } from "date-fns";

import StatsCards from "@/components/dashboard/StatsCards";
import OrdersChart from "@/components/dashboard/OrdersChart";
import UpcomingEvents from "@/components/dashboard/UpcomingEvents";
import AbsencesSummary from "@/components/dashboard/AbsencesSummary";
import RecentNotifications from "@/components/dashboard/RecentNotifications";
import ShiftsOccupancy from "@/components/dashboard/ShiftsOccupancy";

export default function Dashboard() {
  const [data, setData] = useState({
    events: [], orders: [], personal: [], absences: [],
    shifts: [], shiftAssignments: [], notifications: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(startOfToday(), "yyyy-MM-dd");
    Promise.all([
      base44.entities.Event.list("-date_start", 50),
      base44.entities.Order.list("-created_date", 100),
      base44.entities.Personal.list("-created_date", 200),
      base44.entities.Absence.list("-created_date", 100),
      base44.entities.Shift.list("-date", 100),
      base44.entities.ShiftAssignment.list("-created_date", 300),
      base44.entities.Notification.list("-created_date", 30),
    ]).then(([events, orders, personal, absences, shifts, shiftAssignments, notifications]) => {
      setData({ events, orders, personal, absences, shifts, shiftAssignments, notifications });
    }).catch((err) => {
      toast.error("Error al cargar el dashboard: " + (err?.message || "Error desconocido"));
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const today = format(startOfToday(), "yyyy-MM-dd");

  const stats = {
    activeEvents:    data.events.filter(e => e.status !== "cancelled" && e.status !== "completed").length,
    pendingOrders:   data.orders.filter(o => o.status === "pending").length,
    activePersonal:  data.personal.filter(p => p.status === "active").length,
    pendingAbsences: data.absences.filter(a => a.status === "pending").length,
    confirmedShifts: data.shiftAssignments.filter(a => a.status === "confirmed").length,
    todayShifts:     data.shifts.filter(s => s.date === today).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Resumen general de operaciones en tiempo real</p>
      </div>

      <StatsCards data={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShiftsOccupancy shifts={data.shifts} assignments={data.shiftAssignments} loading={loading} />
        <OrdersChart orders={data.orders} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingEvents events={data.events} loading={loading} />
        <AbsencesSummary absences={data.absences} loading={loading} />
      </div>

      <RecentNotifications notifications={data.notifications} loading={loading} />
    </div>
  );
}