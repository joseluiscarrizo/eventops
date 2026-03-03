import { base44 } from '@/api/base44Client';
import { addDays } from 'date-fns';

export const TareasService = {
  // Crear tareas automáticas al asignar un camarero
  async crearTareasIniciales(asignacion, pedido, camarero) {
    const tareasBase = [
      {
        tipo: 'confirmar_asistencia',
        titulo: 'Confirmar Asistencia',
        descripcion: `Confirma tu asistencia al evento de ${pedido.cliente}`,
        prioridad: 'alta',
        orden: 1,
        fecha_limite: pedido.dia ? addDays(new Date(pedido.dia), -2).toISOString().split('T')[0] : null
      },
      {
        tipo: 'revisar_detalles',
        titulo: 'Revisar Detalles del Evento',
        descripcion: 'Revisa la ubicación, horario y requisitos del evento',
        prioridad: 'media',
        orden: 2,
        fecha_limite: pedido.dia ? addDays(new Date(pedido.dia), -1).toISOString().split('T')[0] : null
      },
      {
        tipo: 'recoger_uniforme',
        titulo: 'Recoger Uniforme',
        descripcion: `Recoge tu uniforme (${pedido.camisa || 'consultar detalles'})`,
        prioridad: 'media',
        orden: 3,
        fecha_limite: pedido.dia ? addDays(new Date(pedido.dia), -1).toISOString().split('T')[0] : null
      }
    ];

    // Agregar tarea de transporte si aplica
    if (pedido.extra_transporte) {
      tareasBase.push({
        tipo: 'confirmar_transporte',
        titulo: 'Confirmar Transporte',
        descripcion: 'Confirma los detalles del transporte al evento',
        prioridad: 'alta',
        orden: 4,
        fecha_limite: pedido.dia ? addDays(new Date(pedido.dia), -1).toISOString().split('T')[0] : null
      });
    }

    // Tareas del día del evento
    tareasBase.push(
      {
        tipo: 'reportar_llegada',
        titulo: 'Reportar Llegada',
        descripcion: 'Confirma tu llegada al evento',
        prioridad: 'alta',
        orden: 5,
        fecha_limite: pedido.dia
      },
      {
        tipo: 'completar_servicio',
        titulo: 'Completar Servicio',
        descripcion: 'Marca cuando hayas completado el servicio',
        prioridad: 'media',
        orden: 6,
        fecha_limite: pedido.dia
      }
    );

    // Crear todas las tareas
    const promesas = tareasBase.map(tarea => 
      base44.entities.Tarea.create({
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        pedido_id: pedido.id,
        asignacion_id: asignacion.id,
        ...tarea,
        completada: false
      }).catch(err => console.error('Error creando tarea:', err))
    );

    await Promise.all(promesas);
  },

  // Eliminar tareas cuando se elimina una asignación
  async eliminarTareasAsignacion(asignacionId) {
    try {
      const tareas = await base44.entities.Tarea.filter({ asignacion_id: asignacionId });
      const promesas = tareas.map(t => base44.entities.Tarea.delete(t.id));
      await Promise.all(promesas);
    } catch (err) {
      console.error('Error eliminando tareas:', err);
    }
  }
};

export default TareasService;