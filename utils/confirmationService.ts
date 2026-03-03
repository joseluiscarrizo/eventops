// confirmationService.ts
// Orchestrates the camarero assignment confirmation flow:
//   1. Generates QR code for the event
//   2. Uploads QR image to WhatsApp Media API
//   3. Sends confirmation WhatsApp message (text + QR image) to the camarero

import Logger from './logger.ts';
import { generateEventQR, EventQRData, QRGenerationError } from './qrGenerator.ts';

export class ConfirmationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ConfirmationError';
  }
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getDiaSemana(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return DIAS_SEMANA[fecha.getDay()] || '';
}

async function uploadQRToWhatsApp(
  imageBytes: Uint8Array,
  waToken: string,
  waPhone: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', 'image/png');
  formData.append('file', new Blob([imageBytes], { type: 'image/png' }), 'qr_confirmacion.png');

  const response = await fetch(`https://graph.facebook.com/v18.0/${waPhone}/media`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${waToken}` },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result.id) {
    throw new ConfirmationError(`Error al subir QR a WhatsApp Media: ${JSON.stringify(result)}`);
  }

  Logger.info(`QR subido a WhatsApp Media API, id: ${result.id}`);
  return result.id;
}

async function sendWhatsAppMessage(
  to: string,
  payload: Record<string, unknown>,
  waToken: string,
  waPhone: string,
): Promise<void> {
  const response = await fetch(`https://graph.facebook.com/v18.0/${waPhone}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new ConfirmationError(`Error enviando mensaje WhatsApp: ${JSON.stringify(err)}`);
  }
}

export interface ConfirmCamareroParams {
  telefono: string;
  camareroNombre: string;
  pedido: {
    id: string;
    cliente: string;
    dia?: string;
    entrada?: string;
    nombre?: string;
  };
  waToken: string;
  waPhone: string;
  appUrl?: string;
}

/**
 * Sends a WhatsApp confirmation message to the camarero with event details and a QR code image.
 * The QR image is generated and uploaded to WhatsApp Media API.
 * If QR generation fails, the text-only confirmation message is still sent.
 */
export async function confirmCamareroAssignment(params: ConfirmCamareroParams): Promise<void> {
  const { telefono, pedido, waToken, waPhone, appUrl } = params;

  const linkEvento = `${appUrl || 'https://app.example.com'}/FichajeQR?pedido_id=${pedido.id}`;
  const fechaISO = pedido.dia || '';
  const diaStr = fechaISO ? getDiaSemana(fechaISO) : '';

  const eventQRData: EventQRData = {
    fecha: fechaISO,
    dia: diaStr,
    cliente: pedido.cliente || '',
    evento: pedido.nombre || pedido.cliente || '',
    horaEntrada: pedido.entrada || '',
    linkEvento,
  };

  const confirmationText =
    `✅ *CONFIRMACIÓN DE SERVICIO*\n\n` +
    `📋 *Detalles:*\n` +
    `• Fecha: ${fechaISO || 'Pendiente'}\n` +
    `• Cliente: ${pedido.cliente || ''}\n` +
    `• Evento: ${pedido.nombre || pedido.cliente || ''}\n` +
    `• Hora entrada: ${pedido.entrada || ''}\n` +
    `• Link: ${linkEvento}\n\n` +
    `⏰ *IMPORTANTE:*\n` +
    `*ESTAR 15 MINUTOS ANTES PARA ESTAR A LA HORA EXACTA LISTO PARA EL SERVICIO*\n\n` +
    `¡Gracias por tu confirmación! 🎉`;

  // Send text confirmation message
  await sendWhatsAppMessage(telefono, { type: 'text', text: { body: confirmationText } }, waToken, waPhone);
  Logger.info(`Mensaje de confirmación enviado a ${telefono}`);

  // Generate and send QR image (best-effort; errors are non-fatal)
  try {
    const qrBytes = await generateEventQR(eventQRData);
    const mediaId = await uploadQRToWhatsApp(qrBytes, waToken, waPhone);
    await sendWhatsAppMessage(telefono, { type: 'image', image: { id: mediaId } }, waToken, waPhone);
    Logger.info(`QR enviado como imagen a ${telefono}`);
  } catch (error) {
    if (error instanceof QRGenerationError) {
      Logger.error(`Error generando QR (se omite imagen): ${error.message}`);
    } else {
      Logger.error(`Error enviando imagen QR (se omite): ${error}`);
    }
  }
}
