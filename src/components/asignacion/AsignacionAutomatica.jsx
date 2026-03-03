import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AsignacionAutomatica({ open, onClose, pedido }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignación Automática</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-slate-500">
          Función en desarrollo
        </div>
      </DialogContent>
    </Dialog>
  );
}