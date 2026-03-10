"use client"

import React from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
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
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  ShieldCheck, 
  Database, 
  Cloud,
  Mail,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SystemSettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configuración Guardada",
      description: "Los parámetros globales del sistema han sido actualizados.",
    });
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-black text-slate-200">Configuración del Sistema</h2>
          <p className="text-slate-500 font-medium">Parámetros globales y estado de la infraestructura.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-slate-900/50 border-slate-800 text-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500" />
                General
              </CardTitle>
              <CardDescription className="text-slate-500">Ajustes básicos de marca y operativa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Nombre del Sistema</Label>
                <Input defaultValue="PrestoApp" className="bg-slate-950 border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label>URL Base de la Plataforma</Label>
                <Input defaultValue="https://prestoapp.io" className="bg-slate-950 border-slate-700" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                <div className="space-y-1">
                  <p className="text-sm font-bold">Modo Mantenimiento</p>
                  <p className="text-xs text-slate-500">Bloquea el acceso a todos los usuarios excepto Super Admins.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 text-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Comunicaciones (SMTP)
              </CardTitle>
              <CardDescription className="text-slate-500">Servidor para envío de reportes y alertas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Servidor SMTP</Label>
                <Input defaultValue="smtp.prestoapp.io" className="bg-slate-950 border-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input defaultValue="587" className="bg-slate-950 border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label>Cifrado</Label>
                  <Input defaultValue="TLS" className="bg-slate-950 border-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 text-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-accent" />
                Almacenamiento (Cloudinary)
              </CardTitle>
              <CardDescription className="text-slate-500">Configuración de evidencias fotográficas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cloud Name (PID)</Label>
                <Input value="a91b9a96-b7dc-46b3-a758-090d9afb4e51" disabled className="bg-slate-950 border-slate-700 opacity-50" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input value="************" disabled className="bg-slate-950 border-slate-700 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/5 border-red-500/20 text-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <ShieldCheck className="w-5 h-5" />
                Seguridad de Datos
              </CardTitle>
              <CardDescription className="text-slate-500">Políticas globales de retención.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                <div className="space-y-1">
                  <p className="text-sm font-bold">Inactividad de Sesión</p>
                  <p className="text-xs text-slate-500">Cierra sesión tras 12 horas de inactividad.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-400">Borrado de Logs</p>
                  <p className="text-xs text-slate-500">Elimina logs de auditoría antiguos (más de 5 años).</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800">Descartar Cambios</Button>
          <Button className="bg-red-600 hover:bg-red-700 gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Guardar Configuración Global
          </Button>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
