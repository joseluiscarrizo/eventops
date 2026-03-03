import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from 'lucide-react';

const HABILIDADES_SUGERIDAS = [
  'Coctelería', 'Sommelier', 'Barista', 'Supervisor', 'Jefe de sala',
  'Cocina asiática', 'Cocina mediterránea', 'Cocina internacional',
  'Servicio de banquetes', 'Servicio de buffet', 'Room service',
  'Atención VIP', 'Protocolo', 'Manejo de caja', 'Inventarios'
];

const IDIOMAS_DISPONIBLES = [
  'Español', 'Inglés', 'Francés', 'Alemán', 'Italiano', 'Portugués', 'Chino', 'Árabe', 'Ruso'
];

const CERTIFICACIONES_SUGERIDAS = [
  'Manipulador de alimentos', 'PRL', 'Primeros auxilios', 'APPCC', 'Sommelier certificado'
];

export default function HabilidadesEditor({ 
  habilidades = [], 
  idiomas = [], 
  certificaciones = [],
  onHabilidadesChange,
  onIdiomasChange,
  onCertificacionesChange
}) {
  const [nuevaHabilidad, setNuevaHabilidad] = useState('');

  const agregarHabilidad = (hab) => {
    if (hab && !habilidades.includes(hab)) {
      onHabilidadesChange([...habilidades, hab]);
    }
    setNuevaHabilidad('');
  };

  const quitarHabilidad = (hab) => {
    onHabilidadesChange(habilidades.filter(h => h !== hab));
  };

  const toggleIdioma = (idioma) => {
    if (idiomas.includes(idioma)) {
      onIdiomasChange(idiomas.filter(i => i !== idioma));
    } else {
      onIdiomasChange([...idiomas, idioma]);
    }
  };

  const toggleCertificacion = (cert) => {
    if (certificaciones.includes(cert)) {
      onCertificacionesChange(certificaciones.filter(c => c !== cert));
    } else {
      onCertificacionesChange([...certificaciones, cert]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Habilidades */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Habilidades</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {habilidades.map(hab => (
            <Badge key={hab} variant="secondary" className="flex items-center gap-1">
              {hab}
              <button onClick={() => quitarHabilidad(hab)} className="ml-1 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={nuevaHabilidad}
            onChange={(e) => setNuevaHabilidad(e.target.value)}
            placeholder="Nueva habilidad..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarHabilidad(nuevaHabilidad))}
            className="flex-1"
          />
          <Button type="button" size="icon" onClick={() => agregarHabilidad(nuevaHabilidad)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {HABILIDADES_SUGERIDAS.filter(h => !habilidades.includes(h)).slice(0, 6).map(hab => (
            <button
              key={hab}
              type="button"
              onClick={() => agregarHabilidad(hab)}
              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
            >
              + {hab}
            </button>
          ))}
        </div>
      </div>

      {/* Idiomas */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Idiomas</label>
        <div className="flex flex-wrap gap-2">
          {IDIOMAS_DISPONIBLES.map(idioma => (
            <button
              key={idioma}
              type="button"
              onClick={() => toggleIdioma(idioma)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                idiomas.includes(idioma)
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {idioma}
            </button>
          ))}
        </div>
      </div>

      {/* Certificaciones */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Certificaciones</label>
        <div className="flex flex-wrap gap-2">
          {CERTIFICACIONES_SUGERIDAS.map(cert => (
            <button
              key={cert}
              type="button"
              onClick={() => toggleCertificacion(cert)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                certificaciones.includes(cert)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {cert}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}