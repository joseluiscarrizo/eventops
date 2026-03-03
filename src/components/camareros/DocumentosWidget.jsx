import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DocumentosWidget({ camarero }) {
  const documentos = camarero.documentos || [];
  
  if (documentos.length === 0) return null;

  const hoy = new Date();
  let hayExpirados = false;
  let hayPorExpirar = false;

  documentos.forEach(doc => {
    if (doc.fecha_expiracion && doc.estado === 'aprobado') {
      const expiracion = new Date(doc.fecha_expiracion);
      const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
      
      if (diasRestantes < 0) hayExpirados = true;
      else if (diasRestantes <= 30) hayPorExpirar = true;
    }
  });

  const aprobados = documentos.filter(d => d.estado === 'aprobado').length;
  const pendientes = documentos.filter(d => d.estado === 'pendiente').length;

  return (
    <div className="flex items-center gap-2 text-xs">
      <FileText className="w-3 h-3 text-slate-400" />
      <span className="text-slate-600">{documentos.length} docs</span>
      
      {aprobados > 0 && (
        <Badge className="bg-green-100 text-green-700 text-xs py-0 h-5">
          <CheckCircle className="w-3 h-3 mr-1" />
          {aprobados}
        </Badge>
      )}
      
      {pendientes > 0 && (
        <Badge className="bg-slate-100 text-slate-700 text-xs py-0 h-5">
          {pendientes} pendientes
        </Badge>
      )}
      
      {hayExpirados && (
        <Badge className="bg-red-100 text-red-700 text-xs py-0 h-5">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expirado
        </Badge>
      )}
      
      {!hayExpirados && hayPorExpirar && (
        <Badge className="bg-amber-100 text-amber-700 text-xs py-0 h-5">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Por expirar
        </Badge>
      )}
    </div>
  );
}