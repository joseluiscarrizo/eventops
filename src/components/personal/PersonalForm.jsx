import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";

const PROFILE_CONFIG = {
  camarero:       { label: "Camarero",        prefix: "CAM", specialties: ["Coctelería", "Banquetes", "Restaurant", "Buffet", "VIP"] },
  cocinero:       { label: "Cocinero",         prefix: "COC", specialties: ["Cocina fría", "Cocina caliente", "Pastelería", "Parrilla"] },
  ayudante_cocina:{ label: "Ayudante cocina",  prefix: "AYU", specialties: ["Prep. básica", "Limpieza", "Almacén"] },
  coctelero:      { label: "Coctelero",        prefix: "DRI", specialties: ["Coctelería clásica", "Flair", "Vinos", "Cervezas"] },
  azafata:        { label: "Azafata",          prefix: "AZA", specialties: ["Recepción", "VIP", "Protocolo", "Ferias"] },
};

export default function PersonalForm({ person, onSave, onClose }) {
  const [form, setForm] = useState({
    profile_type: "camarero",
    code: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    coordinator: "",
    specialties: [],
    experience_years: "",
    comments: "",
    certifications: "",
    languages: "",
    availability: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  useEffect(() => {
    if (person) {
      setForm({ ...form, ...person });
      setGeneratedCode(person.code || "");
    } else {
      generateCode("camarero");
    }
  }, []);

  const generateCode = async (profileType) => {
    const all = await base44.entities.Personal.filter({ profile_type: profileType });
    const prefix = PROFILE_CONFIG[profileType]?.prefix || "XXX";
    const num = String(all.length + 1).padStart(3, "0");
    const code = `${prefix}${num}`;
    setGeneratedCode(code);
    return code;
  };

  const handleProfileChange = async (val) => {
    setForm(f => ({ ...f, profile_type: val, specialties: [] }));
    if (!person) {
      await generateCode(val);
    }
  };

  const toggleSpecialty = (s) => {
    setForm(f => ({
      ...f,
      specialties: f.specialties?.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...(f.specialties || []), s],
    }));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, code: person ? form.code : generatedCode };
    if (person) {
      await base44.entities.Personal.update(person.id, data);
    } else {
      await base44.entities.Personal.create(data);
    }
    setSaving(false);
    onSave();
  };

  const cfg = PROFILE_CONFIG[form.profile_type] || PROFILE_CONFIG.camarero;
  const btnLabel = person ? "Guardar cambios" : "Crear perfil";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{person ? "Editar personal" : "Nuevo personal"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <div className="px-5 pt-4">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="skills" className="flex-1">Habilidades y Certificaciones</TabsTrigger>
              </TabsList>
            </div>

            {/* ── GENERAL ── */}
            <TabsContent value="general" className="p-5 space-y-4">
              {/* Perfil / Código / Coordinador */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Perfil *</label>
                  <Select value={form.profile_type} onValueChange={handleProfileChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROFILE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Código</label>
                  <Input value={generatedCode} readOnly className="bg-gray-50 text-gray-500 font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Coordinador</label>
                  <Input value={form.coordinator} onChange={e => set("coordinator", e.target.value)} placeholder="Nombre coordinador..." />
                </div>
              </div>

              {/* Nombre / Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                  <Input value={form.first_name} onChange={e => set("first_name", e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Apellido *</label>
                  <Input value={form.last_name} onChange={e => set("last_name", e.target.value)} required />
                </div>
              </div>

              {/* Teléfono / Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
                  <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>

              {/* Especialidades */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Especialidad</label>
                  <div className="flex flex-wrap gap-2">
                    {cfg.specialties.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.specialties?.includes(s)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Años experiencia</label>
                  <Input type="number" min="0" value={form.experience_years} onChange={e => set("experience_years", e.target.value)} />
                </div>
              </div>

              {/* Comentarios */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Comentarios</label>
                <textarea
                  value={form.comments}
                  onChange={e => set("comments", e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </TabsContent>

            {/* ── HABILIDADES ── */}
            <TabsContent value="skills" className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Certificaciones</label>
                <textarea
                  value={form.certifications}
                  onChange={e => set("certifications", e.target.value)}
                  rows={3}
                  placeholder="Ej: Manipulador de alimentos, Primeros auxilios..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Idiomas</label>
                <Input value={form.languages} onChange={e => set("languages", e.target.value)} placeholder="Ej: Español, Inglés, Francés..." />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Disponibilidad</label>
                <Input value={form.availability} onChange={e => set("availability", e.target.value)} placeholder="Ej: Fines de semana, Jornada completa..." />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Guardando..." : btnLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}