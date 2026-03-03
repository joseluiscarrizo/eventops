import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TestPanel() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (name, status, message) => {
    setResults(prev => [{ name, status, message, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
  };

  const testEntityAccess = async (entityName) => {
    try {
      const data = await base44.entities[entityName]?.list(null, 5);
      addResult(`Acceso ${entityName}`, "success", `${data?.length || 0} registros encontrados`);
    } catch (err) {
      addResult(`Acceso ${entityName}`, "error", err.message);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      const user = await base44.auth.me();
      addResult("Usuario autenticado", "success", `${user?.email || "Anónimo"}`);
    } catch {
      addResult("Usuario autenticado", "error", "No autenticado");
    }

    const entities = ["Personal", "Order", "Shift", "Event", "Client", "ShiftAssignment", "Absence"];
    for (const entity of entities) {
      await testEntityAccess(entity);
    }

    try {
      const stats = {
        personal: await base44.entities.Personal.list(null, 1),
        orders: await base44.entities.Order.list(null, 1),
        shifts: await base44.entities.Shift.list(null, 1),
      };
      addResult("Estadísticas", "success", `P:${stats.personal.length} O:${stats.orders.length} S:${stats.shifts.length}`);
    } catch (err) {
      addResult("Estadísticas", "error", err.message);
    }

    setLoading(false);
    toast.success("Pruebas completadas");
  };

  const clearResults = () => setResults([]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Pruebas</h1>
        <p className="text-gray-500 text-sm mt-1">Prueba las integraciones y acceso a datos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button onClick={runAllTests} disabled={loading} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Zap className="w-4 h-4" />
          {loading ? "Ejecutando..." : "Ejecutar todas las pruebas"}
        </Button>
        <Button onClick={clearResults} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Limpiar resultados
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Resultados ({results.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay resultados. Ejecuta las pruebas para ver los resultados.</p>
          ) : (
            results.map((result, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                result.status === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              }`}>
                {result.status === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{result.name}</div>
                  <div className={result.status === "success" ? "text-green-700" : "text-red-700"}>{result.message}</div>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">{result.timestamp}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}