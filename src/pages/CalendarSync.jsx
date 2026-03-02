import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Calendar, RefreshCw, ExternalLink, CheckCircle2, Clock, AlertCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CalendarSync() {
  const [googleEvents, setGoogleEvents] = useState([]);
  const [appEvents, setAppEvents] = useState([]);
  const [googleShifts, setGoogleShifts] = useState([]);
  const [appShifts, setAppShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState({});
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('events');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appEvs, gcalRes, appShiftsRes, gcalShiftsRes] = await Promise.all([
        base44.entities.Event.list("-date_start", 50),
        base44.functions.invoke('getGoogleCalendarEvents', {}),
        base44.entities.Shift.list("-date", 100),
        base44.functions.invoke('syncShiftsFromGoogle', {}),
      ]);
      setAppEvents(appEvs);
      setGoogleEvents(gcalRes.data?.events || []);
      setAppShifts(appShiftsRes);
      setGoogleShifts(gcalShiftsRes.data?.events || []);
    } catch (e) {
      setError("No se pudieron cargar los eventos de Google Calendar.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const syncToGoogle = async (event, action = 'create') => {
    setSyncing(prev => ({ ...prev, [event.id]: true }));
    try {
      await base44.functions.invoke('syncToGoogleCalendar', {
        event_id: event.id,
        action: event.gcal_event_id ? 'update' : 'create',
      });
      await loadData();
    } catch (e) {
      toast.error("Error al sincronizar: " + e.message);
    }
    setSyncing(prev => ({ ...prev, [event.id]: false }));
  };

  const syncAll = async () => {
    const unsyncedEvents = appEvents.filter(e => !e.gcal_synced && e.status !== 'cancelled');
    for (const event of unsyncedEvents) {
      await syncToGoogle(event);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try { return format(new Date(dateStr), "d MMM yyyy HH:mm", { locale: es }); }
    catch { return dateStr; }
  };

  const syncedCount = appEvents.filter(e => e.gcal_synced).length;

  const syncShiftToGoogle = async (shift, personal_id) => {
    setSyncing(prev => ({ ...prev, [shift.id]: true }));
    try {
      await base44.functions.invoke('syncShiftToGoogle', {
        shift_id: shift.id,
        personal_id,
        action: 'create',
      });
      await loadData();
    } catch (e) {
      toast.error("Error al sincronizar turno: " + e.message);
    }
    setSyncing(prev => ({ ...prev, [shift.id]: false }));
  };

  const deleteShiftFromGoogle = async (shift, personal_id) => {
    setSyncing(prev => ({ ...prev, [shift.id]: true }));
    try {
      await base44.functions.invoke('syncShiftToGoogle', {
        shift_id: shift.id,
        personal_id,
        action: 'delete',
      });
      await loadData();
    } catch (e) {
      toast.error("Error al eliminar turno: " + e.message);
    }
    setSyncing(prev => ({ ...prev, [shift.id]: false }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            Sincronización de Calendarios
          </h1>
          <p className="text-gray-500 mt-1">Conecta EventOps con Google Calendar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={syncAll} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <ArrowUpDown className="w-4 h-4" />
            Sincronizar todos
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="bg-indigo-50 w-10 h-10 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{appEvents.length}</div>
            <div className="text-xs text-gray-500">Eventos en la app</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="bg-emerald-50 w-10 h-10 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{syncedCount}</div>
            <div className="text-xs text-gray-500">Sincronizados con Google</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center">
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-5 h-5" alt="Google Calendar" />
          </div>
          <div>
            <div className="text-2xl font-bold">{googleEvents.length}</div>
            <div className="text-xs text-gray-500">Eventos en Google Calendar</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'events'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Eventos
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'shifts'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Turnos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {activeTab === 'events' ? (
          <>
            {/* App Events */}
            <div className="bg-white rounded-xl border">
          <div className="p-4 border-b font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            Eventos de EventOps
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 animate-pulse flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : appEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No hay eventos</div>
            ) : (
              appEvents.map(event => (
                <div key={event.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{event.name}</div>
                    <div className="text-xs text-gray-500">{formatDate(event.date_start)}</div>
                  </div>
                  {event.gcal_synced ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sincronizado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      Sin sincronizar
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2"
                    disabled={syncing[event.id]}
                    onClick={() => syncToGoogle(event)}
                  >
                    {syncing[event.id] ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : event.gcal_synced ? "Actualizar" : "Sincronizar"}
                  </Button>
                </div>
              ))
            )}
            </div>
          </div>

          {/* Google Calendar Events */}
          <div className="bg-white rounded-xl border">
          <div className="p-4 border-b font-semibold text-gray-900 flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-4 h-4" alt="" />
            Eventos en Google Calendar
            <span className="ml-auto text-xs text-gray-400 font-normal">Próximos 30 días</span>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 animate-pulse flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : googleEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No hay eventos en Google Calendar</div>
            ) : (
              googleEvents.map(event => (
                <div key={event.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{event.title}</div>
                    <div className="text-xs text-gray-500">{formatDate(event.start)}</div>
                    {event.location && (
                      <div className="text-xs text-gray-400 truncate">{event.location}</div>
                    )}
                  </div>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))
              )}
            </div>
          </div>
          </>
        ) : (
          <>
            {/* App Shifts */}
            <div className="bg-white rounded-xl border">
            <div className="p-4 border-b font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              Turnos en EventOps
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse flex gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : appShifts.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No hay turnos</div>
              ) : (
                appShifts.map(shift => (
                  <div key={shift.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{shift.title}</div>
                      <div className="text-xs text-gray-500">{formatDate(shift.date + 'T' + shift.time_start)}</div>
                      <div className="text-xs text-gray-400">{shift.profile_required}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2"
                      disabled={syncing[shift.id]}
                      onClick={() => syncShiftToGoogle(shift, shift.personal_id)}
                    >
                      {syncing[shift.id] ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : "Sincronizar"}
                    </Button>
                  </div>
                ))
              )}
              </div>
            </div>

            {/* Google Calendar Shifts */}
            <div className="bg-white rounded-xl border">
            <div className="p-4 border-b font-semibold text-gray-900 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-4 h-4" alt="" />
              Turnos en Google Calendar
              <span className="ml-auto text-xs text-gray-400 font-normal">Próximos 90 días</span>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse flex gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : googleShifts.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No hay turnos en Google Calendar</div>
              ) : (
                googleShifts.map(shift => (
                  <div key={shift.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{shift.title}</div>
                      <div className="text-xs text-gray-500">{formatDate(shift.start)}</div>
                      {shift.location && (
                        <div className="text-xs text-gray-400 truncate">{shift.location}</div>
                      )}
                    </div>
                    <a
                      href={shift.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}