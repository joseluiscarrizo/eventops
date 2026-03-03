import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const tipoClienteColors = {
  restaurante: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  hotel: 'bg-blue-100 text-blue-700 border-blue-200',
  catering: 'bg-purple-100 text-purple-700 border-purple-200',
  masia: 'bg-amber-100 text-amber-700 border-amber-200'
};

export default function PedidosTable({ pedidos, onEdit, onDelete, selectedIds, onSelectChange, onSelectAll }) {
  const allSelected = pedidos.length > 0 && selectedIds.length === pedidos.length;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-slate-700">Coordinador</TableHead>
              <TableHead className="font-semibold text-slate-700">Día</TableHead>
              <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
              <TableHead className="font-semibold text-slate-700">Lugar</TableHead>
              <TableHead className="font-semibold text-slate-700">Camisa</TableHead>
              <TableHead className="font-semibold text-slate-700">Cód.</TableHead>
              <TableHead className="font-semibold text-slate-700">Camarero</TableHead>
              <TableHead className="font-semibold text-slate-700">Entrada</TableHead>
              <TableHead className="font-semibold text-slate-700">Salida</TableHead>
              <TableHead className="font-semibold text-slate-700">Horas</TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">Enviado</TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">Confirmado</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {pedidos.map((pedido) => (
                <motion.tr
                  key={pedido.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(pedido.id)}
                      onCheckedChange={(checked) => onSelectChange(pedido.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{pedido.coordinador}</TableCell>
                  <TableCell className="text-slate-600">
                    {pedido.dia ? format(new Date(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-800">{pedido.cliente}</span>
                      {pedido.tipo_cliente && (
                        <Badge variant="outline" className={`text-xs w-fit ${tipoClienteColors[pedido.tipo_cliente]}`}>
                          {pedido.tipo_cliente}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{pedido.lugar_evento || '-'}</TableCell>
                  <TableCell className="text-slate-600">{pedido.camisa || '-'}</TableCell>
                  <TableCell className="text-slate-600 font-mono text-sm">{pedido.cod_camarero || '-'}</TableCell>
                  <TableCell className="font-medium text-slate-800">{pedido.camarero}</TableCell>
                  <TableCell className="text-slate-600 font-mono">{pedido.entrada || '-'}</TableCell>
                  <TableCell className="text-slate-600 font-mono">{pedido.salida || '-'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-[#1e3a5f]/10 text-[#1e3a5f]">
                      {pedido.t_horas || 0}h
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {pedido.enviado ? (
                      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {pedido.confirmado ? (
                      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onEdit(pedido)}
                        className="h-8 w-8 text-slate-500 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onDelete(pedido.id)}
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
            {pedidos.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="h-32 text-center text-slate-500">
                  No hay pedidos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}