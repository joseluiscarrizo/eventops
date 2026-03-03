import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../utils/mocks.js';
import { mockBase44 } from '../utils/mocks.js';
import { createAsignacion, createPedido, fixtures } from '../utils/factories.js';
import { renderWithProviders } from '../utils/render.jsx';
import { toast } from 'sonner';

import ConfirmarServicio from '@/pages/ConfirmarServicio';

describe('Confirmar Servicio (sin auth)', () => {
  const asignacionMock = createAsignacion({
    id: 'asignacion-test-1',
    pedido_id: 'pedido-test-1',
    camarero_id: 'camarero-1',
    camarero_nombre: 'Carlos López',
    estado: 'pendiente'
  });

  const pedidoMock = createPedido({
    id: 'pedido-test-1',
    cliente: 'Empresa Test',
    dia: '2026-03-15',
    lugar_evento: 'Salón Gran Vía',
    entrada: '18:00',
    salida: '23:00'
  });

  beforeEach(() => {
    mockBase44.entities.AsignacionCamarero.filter.mockResolvedValue([asignacionMock]);
    mockBase44.entities.Pedido.filter.mockResolvedValue([pedidoMock]);
    mockBase44.entities.Camarero.filter.mockResolvedValue([fixtures.camareros[0]]);
    mockBase44.entities.Camarero.update.mockResolvedValue({});
    mockBase44.entities.AsignacionCamarero.update.mockResolvedValue({});
    mockBase44.entities.AsignacionCamarero.delete.mockResolvedValue({});
    mockBase44.entities.NotificacionCamarero.filter.mockResolvedValue([]);
    mockBase44.entities.NotificacionCamarero.update.mockResolvedValue({});
    mockBase44.entities.Coordinador.filter.mockResolvedValue([fixtures.coordinadores[0]]);
    mockBase44.entities.Notificacion.create.mockResolvedValue({ id: 'notif-1' });
    mockBase44.integrations.Core.SendEmail.mockResolvedValue({ success: true });
  });

  test('muestra error cuando no hay token en la URL', async () => {
    globalThis.location.search = '';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('muestra mensaje de error descriptivo al faltar token', async () => {
    globalThis.location.search = '';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument();
    });
  });

  test('carga datos de servicio con token de asignación válido', async () => {
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByText(/empresa test/i)).toBeInTheDocument();
    });
  });

  test('muestra detalles del servicio (cliente)', async () => {
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByText('Empresa Test')).toBeInTheDocument();
    });
  });

  test('muestra detalles del servicio (ubicación)', async () => {
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByText(/salón gran vía/i)).toBeInTheDocument();
    });
  });

  test('muestra botones de confirmar y rechazar', async () => {
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acepto servicio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rechazo servicio/i })).toBeInTheDocument();
    });
  });

  test('confirma asistencia al hacer click en Acepto Servicio', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acepto servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /acepto servicio/i }));

    await waitFor(() => {
      expect(mockBase44.entities.AsignacionCamarero.update).toHaveBeenCalledWith(
        'asignacion-test-1',
        expect.objectContaining({ estado: 'confirmado' })
      );
    });
  });

  test('muestra toast de éxito al confirmar servicio', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acepto servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /acepto servicio/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  test('muestra pantalla de procesado después de confirmar', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acepto servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /acepto servicio/i }));

    await waitFor(() => {
      expect(screen.getByText(/Procesado/)).toBeInTheDocument();
    });
  });

  test('muestra formulario de rechazo al hacer click en Rechazo', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rechazo servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /rechazo servicio/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/motivo del rechazo/i)).toBeInTheDocument();
    });
  });

  test('rechaza asignación con motivo y elimina asignación en BD', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rechazo servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /rechazo servicio/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/motivo del rechazo/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/motivo del rechazo/i), 'No puedo asistir por motivos personales');

    await user.click(screen.getByRole('button', { name: /confirmar rechazo/i }));

    await waitFor(() => {
      expect(mockBase44.entities.AsignacionCamarero.delete).toHaveBeenCalledWith('asignacion-test-1');
    });
  });

  test('muestra toast de éxito al rechazar servicio', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rechazo servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /rechazo servicio/i }));
    await waitFor(() => screen.getByPlaceholderText(/motivo del rechazo/i));
    await user.click(screen.getByRole('button', { name: /confirmar rechazo/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  test('carga directamente en pantalla de rechazo con ?action=rechazar', async () => {
    globalThis.location.search = '?asignacion=asignacion-test-1&action=rechazar';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/motivo del rechazo/i)).toBeInTheDocument();
    });
  });

  test('actualiza estado del camarero a ocupado al confirmar', async () => {
    const user = userEvent.setup();
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acepto servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /acepto servicio/i }));

    await waitFor(() => {
      expect(mockBase44.entities.Camarero.update).toHaveBeenCalledWith(
        'camarero-1',
        expect.objectContaining({ estado_actual: 'ocupado' })
      );
    });
  });

  test('muestra error al fallo de confirmación en BD', async () => {
    const user = userEvent.setup();
    mockBase44.entities.AsignacionCamarero.update.mockRejectedValueOnce(new Error('Error de BD'));
    globalThis.location.search = '?asignacion=asignacion-test-1';

    renderWithProviders(<ConfirmarServicio />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acepto servicio/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /acepto servicio/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
