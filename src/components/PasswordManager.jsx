import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, RefreshCw, KeyRound, ChevronDown, Copy, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { validatePassword } from '@/utils/passwordValidator';
import { generatePassword } from '@/utils/passwordGenerator';

export default function PasswordManager({ userId }) {
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGenerated, setShowGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [changeForm, setChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const passwordValidation = validatePassword(changeForm.newPassword);

  const strengthColors = {
    weak: 'bg-red-400',
    medium: 'bg-amber-400',
    strong: 'bg-emerald-400',
  };

  const strengthLabels = {
    weak: 'Débil',
    medium: 'Media',
    strong: 'Fuerte',
  };

  const handleChangePassword = async () => {
    if (!changeForm.currentPassword) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }
    if (!passwordValidation.isValid) {
      toast.error('La nueva contraseña no cumple los requisitos');
      return;
    }
    if (changeForm.newPassword !== changeForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      await base44.auth.changePassword({
        userId,
        currentPassword: changeForm.currentPassword,
        newPassword: changeForm.newPassword,
      });
      toast.success('Contraseña actualizada correctamente');
      setShowChangeModal(false);
      setChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Error al cambiar contraseña: ' + (error.message || 'Contraseña actual incorrecta'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(14);
    setGeneratedPassword(newPassword);
    setShowGenerated(false);
    setCopied(false);
    setShowGenerateModal(true);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex items-center justify-between px-4 py-3 h-auto border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 tracking-widest">••••••••••••</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="start">
          <DropdownMenuItem
            className="flex items-center gap-3 py-2.5 cursor-pointer"
            onClick={() => setShowChangeModal(true)}
          >
            <KeyRound className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Cambiar Contraseña</p>
              <p className="text-xs text-slate-400">Actualizar contraseña actual</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-3 py-2.5 cursor-pointer"
            onClick={handleGeneratePassword}
          >
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Generar Nueva Contraseña</p>
              <p className="text-xs text-slate-400">Crear contraseña segura automáticamente</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal: Cambiar Contraseña */}
      <Dialog open={showChangeModal} onOpenChange={setShowChangeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-500" />
              Cambiar Contraseña
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={changeForm.currentPassword}
                  onChange={(e) => setChangeForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Ingresa tu contraseña actual"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={changeForm.newPassword}
                  onChange={(e) => setChangeForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Nueva contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {changeForm.newPassword && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strengthColors[passwordValidation.strength]}`}
                        style={{
                          width: passwordValidation.strength === 'strong' ? '100%' :
                                 passwordValidation.strength === 'medium' ? '60%' : '30%'
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordValidation.strength === 'strong' ? 'text-emerald-600' :
                      passwordValidation.strength === 'medium' ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {strengthLabels[passwordValidation.strength]}
                    </span>
                  </div>
                  {passwordValidation.errors.length > 0 && (
                    <ul className="space-y-0.5">
                      {passwordValidation.errors.map((err, i) => (
                        <li key={i} className="text-xs text-red-500 flex items-center gap-1">
                          <span>•</span> {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={changeForm.confirmPassword}
                  onChange={(e) => setChangeForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirma la nueva contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {changeForm.confirmPassword && changeForm.newPassword !== changeForm.confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowChangeModal(false);
                setChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45]"
              onClick={handleChangePassword}
              disabled={isLoading || !passwordValidation.isValid || changeForm.newPassword !== changeForm.confirmPassword}
            >
              {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Generar Nueva Contraseña */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              Nueva Contraseña Generada
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Se ha generado una contraseña segura. Cópiala y compártela con el usuario de forma segura.
            </p>

            <div className="space-y-2">
              <Label>Contraseña generada</Label>
              <div className="relative">
                <Input
                  type={showGenerated ? 'text' : 'password'}
                  value={generatedPassword}
                  readOnly
                  className="pr-20 font-mono bg-slate-50"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowGenerated(!showGenerated)}
                    title={showGenerated ? 'Ocultar' : 'Ver'}
                  >
                    {showGenerated ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                    onClick={handleCopyPassword}
                    title="Copiar"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                ⚠️ Comparte esta contraseña de forma segura. El usuario deberá cambiarla al iniciar sesión.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowGenerateModal(false)}
            >
              Cerrar
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                const newPassword = generatePassword(14);
                setGeneratedPassword(newPassword);
                setShowGenerated(false);
                setCopied(false);
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
