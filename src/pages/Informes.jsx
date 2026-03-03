import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, Users, TrendingUp, Building2, UserCheck, BarChart3, Activity, Clock } from 'lucide-react';
import ResumenPeriodo from '../components/informes/ResumenPeriodo';
import RendimientoCamareros from '../components/informes/RendimientoCamareros';
import ReporteDisponibilidad from '../components/informes/ReporteDisponibilidad';
import InformeCliente from '../components/informes/InformeCliente';
import InformeCamarero from '../components/informes/InformeCamarero';
import AnalisisTendencias from '../components/informes/AnalisisTendencias';
import AnalisisDemanda from '../components/informes/AnalisisDemanda';
import InformesProgramados from '../components/informes/InformesProgramados';

export default function Informes() {
  const [activeTab, setActiveTab] = useState('resumen');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#1e3a5f]" />
            Informes y Reportes
          </h1>
          <p className="text-slate-500 mt-1">Análisis detallado de pedidos y camareros</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 mb-6">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="demanda" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Demanda</span>
            </TabsTrigger>
            <TabsTrigger value="rendimiento" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Rendimiento</span>
            </TabsTrigger>
            <TabsTrigger value="disponibilidad" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Disponibilidad</span>
            </TabsTrigger>
            <TabsTrigger value="cliente" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Por Cliente</span>
            </TabsTrigger>
            <TabsTrigger value="camarero" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Por Camarero</span>
            </TabsTrigger>
            <TabsTrigger value="programados" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Programados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <ResumenPeriodo />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalisisTendencias />
          </TabsContent>
          <TabsContent value="demanda">
            <AnalisisDemanda />
          </TabsContent>
          <TabsContent value="rendimiento">
            <RendimientoCamareros />
          </TabsContent>
          <TabsContent value="disponibilidad">
            <ReporteDisponibilidad />
          </TabsContent>
          <TabsContent value="cliente">
            <InformeCliente />
          </TabsContent>
          <TabsContent value="camarero">
            <InformeCamarero />
          </TabsContent>
          <TabsContent value="programados">
            <InformesProgramados />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}