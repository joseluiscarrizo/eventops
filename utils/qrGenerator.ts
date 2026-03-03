// qrGenerator.ts
// Generates QR codes for event confirmations sent to camareros via WhatsApp.

import QRCode from 'npm:qrcode@^1.5.0';
import Logger from './logger.ts';

export interface EventQRData {
  fecha: string;        // YYYY-MM-DD
  dia: string;          // Nombre del día (Lunes, Martes, etc.)
  cliente: string;      // Nombre del cliente
  evento: string;       // Nombre del evento/pedido
  horaEntrada: string;  // HH:MM
  linkEvento: string;   // URL del evento
}

export class QRGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'QRGenerationError';
  }
}

function validateEventQRData(data: EventQRData): void {
  const required: (keyof EventQRData)[] = ['fecha', 'dia', 'cliente', 'evento', 'horaEntrada', 'linkEvento'];
  for (const field of required) {
    if (!data[field]) {
      throw new QRGenerationError(`Campo requerido faltante: ${field}`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
    throw new QRGenerationError(`Formato de fecha inválido: ${data.fecha}. Se esperaba YYYY-MM-DD`);
  }

  if (!/^\d{2}:\d{2}$/.test(data.horaEntrada)) {
    throw new QRGenerationError(`Formato de hora inválido: ${data.horaEntrada}. Se esperaba HH:MM`);
  }

  try {
    new URL(data.linkEvento);
  } catch {
    throw new QRGenerationError(`URL inválida: ${data.linkEvento}`);
  }
}

function formatQRText(data: EventQRData): string {
  return `${data.fecha};${data.dia};${data.cliente};${data.evento};${data.horaEntrada}\n${data.linkEvento}`;
}

/**
 * Generates a QR code PNG as Uint8Array for the given event data.
 * The QR text format is: "Fecha;Día;Cliente;Evento;Hora_Entrada\nLink_Evento"
 */
export async function generateEventQR(eventData: EventQRData): Promise<Uint8Array> {
  validateEventQRData(eventData);
  const qrText = formatQRText(eventData);

  try {
    // toDataURL returns 'data:image/png;base64,...'
    const dataUrl: string = await QRCode.toDataURL(qrText, {
      type: 'image/png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    Logger.info(`QR generado para evento: ${eventData.cliente} - ${eventData.fecha}`);
    return bytes;
  } catch (error) {
    throw new QRGenerationError('Error al generar el código QR', error);
  }
}
