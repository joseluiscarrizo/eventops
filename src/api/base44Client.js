import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

// Validar que las variables de entorno necesarias están definidas
if (!import.meta.env.VITE_BASE44_APP_ID) {
  throw new Error('VITE_BASE44_APP_ID environment variable is required');
}

if (!import.meta.env.VITE_BASE44_BACKEND_URL) {
  throw new Error('VITE_BASE44_BACKEND_URL environment variable is required');
}

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: true
});
