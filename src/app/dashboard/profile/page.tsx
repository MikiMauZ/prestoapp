"use client"

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Save, 
  User as UserIcon, 
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth || !user.email) return;

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Las nuevas contraseñas no coinciden.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Contraseña débil",
        description: "La nueva contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Re-autenticar al usuario (requerido por Firebase para cambios de seguridad)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Actualizar la contraseña
      await updatePassword(user, newPassword);

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente.",
      });

      // Limpiar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      let message = "No se pudo actualizar la contraseña.";
      if (error.code === 'auth/wrong-password') {
        message = "La contraseña actual es incorrecta.";
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-accent" />
            Mi Perfil
          </h2>
          <p className="text-muted-foreground font-medium">Gestiona tu información personal y seguridad de cuenta.</p>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader>
            <CardTitle className="text-xl">Datos de Usuario</CardTitle>
            <CardDescription>Información vinculada a tu cuenta profesional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs uppercase font-black text-muted-foreground">Email</Label>
                <p className="text-sm font-bold bg-secondary/30 p-2 rounded border">{user?.email}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-black text-muted-foreground">ID de Usuario</Label>
                <p className="text-[10px] font-mono bg-secondary/30 p-2 rounded border truncate">{user?.uid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="w-5 h-5 text-accent" />
              Seguridad: Cambiar Contraseña
            </CardTitle>
            <CardDescription>Se requiere la contraseña actual para confirmar el cambio.</CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordChange}>
            <CardContent className="pt-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showPass ? "text" : "password"} 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required 
                    placeholder="••••••••"
                    className="h-11"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                    placeholder="Mínimo 6 caracteres"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    placeholder="Repite la contraseña"
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-6 flex justify-between items-center border-t">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Conexión Segura con Firebase Auth
              </div>
              <Button type="submit" className="gap-2 bg-primary px-8" disabled={loading}>
                {loading ? "Actualizando..." : (
                  <>
                    <Save className="w-4 h-4" />
                    Actualizar Contraseña
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
