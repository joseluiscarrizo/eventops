import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { role } = useRole();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-orange-200">
        <div className="flex justify-center mb-4">
          <div className="bg-orange-100 p-4 rounded-full">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Acceso Denegado
        </h1>

        <p className="text-center text-slate-600 mb-6">
          No tienes permisos para acceder a esta página.
          {role && <span className="block text-sm text-slate-500 mt-2">Tu rol: {role}</span>}
        </p>

        <Button
          onClick={() => navigate('/')}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Home className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>
      </Card>
    </div>
  );
}
