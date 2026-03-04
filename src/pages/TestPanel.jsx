import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Zap, RefreshCw, Play, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SIMULATIONS = [
  {
    id: "auth",
    label: "Autenticación",
    description: "Verifica que el usuario esté autenticado y tiene rol correcto",
    steps: [
      { name: "Obtener usuario actual", run: async () => { const u = await base44.auth.me(); return `${u.email} (${u.role})`; } },
    ]
  },
  {
    id: "entities",
    label: "Acceso a Entidades",
    description: "Lee las entidades principales de la base de datos",
    steps: [
      { name: "Listar Personal", run: async () => { const d = await base44.entities.Personal.list(null, 5); return `${d.length} registros`; } },
      { name: "Listar Pedidos", run: async () => { const d = await base44.entities.Order.list(null, 5); return `${d.length} registros`; } },
      { name: "Listar Eventos", run: async () => { const d = await base44.entities.Event.list(null, 5); return `${d.length} registros`; } },
      { name: "Listar Clientes", run: async () => { const d = await base44.entities.Client.list(null, 5); return `${d.length} registros`; } },
      { name: "Listar Turnos", run: async () => { const d = await base44.entities.Shift.list(null, 5); return `${d.length} registros`; } },
      { name: "Listar Ausencias", run: async () => { const d = await base44.entities.Absence.list(null, 5); return `${d.length} registros`; } },
      { name: "Listar Notificaciones", run: async () => { const d = await base44.entities.Notification.list(null, 5); return `${d.length} registros`; } },
    ]
  },
  {
    id: "assignment_flow",
    label: "Flujo de Asignación",
    description: "Simula crear un pedido, asignar personal y confirmar la asignación",
    steps: [
      {
        name: "Buscar cliente de prueba",
        run: async (ctx) => {
          const clients = await base44.entities.Client.list(null, 1);
          if (!clients.length) throw new Error("No hay clientes. Crea uno primero.");
          ctx.client = clients[0];
          return `Cliente: ${clients[0].name}`;
        }
      },
      {
        name: "Buscar personal disponible",
        run: async (ctx) => {
          const personal = await base44.entities.Personal.filter({ status: "active" }, null, 1);
          if (!personal.length) throw new Error("No hay personal activo.");
          ctx.personal = personal[0];
          return `Personal: ${personal[0].first_name} ${personal[0].last_name}`;
        }
      },
      {
        name: "Crear pedido de prueba",
        run: async (ctx) => {
          const order = await base44.entities.Order.create({
            client_id: ctx.client.id,
            client_name: ctx.client.name,
            event_place: "Lugar de prueba - TEST",
            event_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
            entry_time_1: "18:00",
            status: "pending",
            notes: "Pedido creado automáticamente por panel de pruebas"
          });
          ctx.order = order;
          return `Pedido ${order.order_number || order.id} creado`;
        }
      },
      {
        name: "Asignar personal al pedido",
        run: async (ctx) => {
          const assignment = await base44.entities.OrderAssignment.create({
            order_id: ctx.order.id,
            personal_id: ctx.personal.id,
            personal_name: `${ctx.personal.first_name} ${ctx.personal.last_name}`,
            profile_type: ctx.personal.profile_type,
            status: "pending"
          });
          ctx.assignment = assignment;
          return `Asignación creada`;
        }
      },
      {
        name: "Confirmar asignación",
        run: async (ctx) => {
          await base44.entities.OrderAssignment.update(ctx.assignment.id, { status: "confirmed" });
          return `Asignación confirmada`;
        }
      },
      {
        name: "Eliminar pedido de prueba",
        run: async (ctx) => {
          await base44.entities.OrderAssignment.delete(ctx.assignment.id);
          await base44.entities.Order.delete(ctx.order.id);
          return `Limpieza completada`;
        }
      }
    ]
  },
  {
    id: "notification_flow",
    label: "Flujo de Notificaciones",
    description: "Crea y lee una notificación de prueba",
    steps: [
      {
        name: "Crear notificación de prueba",
        run: async (ctx) => {
          const u = await base44.auth.me();
          const notif = await base44.entities.Notification.create({
            recipient_email: u.email,
            recipient_name: u.full_name,
            type: "general",
            title: "Notificación de prueba",
            message: "Esta es una notificación generada por el panel de pruebas",
            read: false
          });
          ctx.notif = notif;
          return `Notificación creada (ID: ${notif.id})`;
        }
      },
      {
        name: "Leer notificación",
        run: async (ctx) => {
          const found = await base44.entities.Notification.filter({ id: ctx.notif.id });
          if (!found.length) throw new Error("Notificación no encontrada");
          return `Leída: "${found[0].title}"`;
        }
      },
      {
        name: "Marcar como leída",
        run: async (ctx) => {
          await base44.entities.Notification.update(ctx.notif.id, { read: true });
          return `Marcada como leída`;
        }
      },
      {
        name: "Eliminar notificación de prueba",
        run: async (ctx) => {
          await base44.entities.Notification.delete(ctx.notif.id);
          return `Limpieza completada`;
        }
      }
    ]
  },
  {
    id: "absence_flow",
    label: "Flujo de Ausencias",
    description: "Simula registrar y aprobar una ausencia de personal",
    steps: [
      {
        name: "Buscar personal",
        run: async (ctx) => {
          const personal = await base44.entities.Personal.filter({ status: "active" }, null, 1);
          if (!personal.length) throw new Error("No hay personal activo.");
          ctx.personal = personal[0];
          return `Personal: ${personal[0].first_name} ${personal[0].last_name}`;
        }
      },
      {
        name: "Crear ausencia de prueba",
        run: async (ctx) => {
          const today = new Date().toISOString().split("T")[0];
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
          const absence = await base44.entities.Absence.create({
            personal_id: ctx.personal.id,
            personal_name: `${ctx.personal.first_name} ${ctx.personal.last_name}`,
            type: "permiso",
            date_start: today,
            date_end: tomorrow,
            reason: "Prueba generada automáticamente",
            status: "pending"
          });
          ctx.absence = absence;
          return `Ausencia creada`;
        }
      },
      {
        name: "Aprobar ausencia",
        run: async (ctx) => {
          await base44.entities.Absence.update(ctx.absence.id, { status: "approved" });
          return `Ausencia aprobada`;
        }
      },
      {
        name: "Eliminar ausencia de prueba",
        run: async (ctx) => {
          await base44.entities.Absence.delete(ctx.absence.id);
          return `Limpieza completada`;
        }
      }
    ]
  },
];

function SimulationCard({ sim }) {
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [stepResults, setStepResults] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const run = async () => {
    setState("running");
    setStepResults([]);
    setExpanded(true);
    const ctx = {};
    const results = [];
    let failed = false;

    for (const step of sim.steps) {
      if (failed) {
        results.push({ name: step.name, status: "skipped", message: "Omitido" });
        setStepResults([...results]);
        continue;
      }
      try {
        const msg = await step.run(ctx);
        results.push({ name: step.name, status: "success", message: msg });
      } catch (err) {
        results.push({ name: step.name, status: "error", message: err.message });
        failed = true;
      }
      setStepResults([...results]);
    }

    setState(failed ? "error" : "done");
    if (!failed) toast.success(`✓ ${sim.label} completada`);
    else toast.error(`✗ ${sim.label} falló`);
  };

  const reset = () => { setState("idle"); setStepResults([]); setExpanded(false); };

  const borderColor = state === "done" ? "border-green-300" : state === "error" ? "border-red-300" : "border-border";
  const headerBg = state === "done" ? "bg-green-50 dark:bg-green-950/20" : state === "error" ? "bg-red-50 dark:bg-red-950/20" : "";

  return (
    <Card className={`border ${borderColor} transition-colors`}>
      <CardHeader className={`pb-3 ${headerBg} rounded-t-xl`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {state === "done" && <CheckCircle className="w-4 h-4 text-green-600" />}
              {state === "error" && <AlertCircle className="w-4 h-4 text-red-600" />}
              {state === "running" && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
              {sim.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{sim.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {state !== "idle" && (
              <Button size="sm" variant="ghost" onClick={reset} className="h-7 px-2 text-xs">
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={run}
              disabled={state === "running"}
              className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Play className="w-3 h-3 mr-1" />
              {state === "running" ? "Ejecutando..." : "Simular"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {stepResults.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t border-border transition-colors"
          >
            <span>{stepResults.length} / {sim.steps.length} pasos</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {expanded && (
            <CardContent className="pt-2 pb-3 space-y-1.5">
              {stepResults.map((r, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                  r.status === "success" ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300" :
                  r.status === "error" ? "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {r.status === "success" && <CheckCircle className="w-3 h-3 mt-0.5 shrink-0 text-green-600" />}
                  {r.status === "error" && <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-red-600" />}
                  {r.status === "skipped" && <span className="w-3 h-3 mt-0.5 shrink-0 text-gray-400">–</span>}
                  <div>
                    <span className="font-medium">{r.name}:</span> {r.message}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </>
      )}
    </Card>
  );
}

export default function TestPanel() {
  const [runningAll, setRunningAll] = useState(false);
  const [key, setKey] = useState(0);

  const runAll = () => {
    setKey(k => k + 1);
    toast.info("Ejecutando todas las simulaciones...");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Pruebas</h1>
          <p className="text-muted-foreground text-sm mt-1">Simula los flujos principales de la aplicación</p>
        </div>
        <Button onClick={runAll} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Zap className="w-4 h-4" />
          Ejecutar todo
        </Button>
      </div>

      <div className="space-y-4" key={key}>
        {SIMULATIONS.map(sim => (
          <SimulationCard key={sim.id} sim={sim} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Los datos creados durante las simulaciones se eliminan automáticamente al finalizar cada prueba.
      </p>
    </div>
  );
}