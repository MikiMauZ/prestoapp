
"use client"

import React, { useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { 
  Card, 
  CardHeader, 
  CardContent 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Mail, 
  UserPlus,
  MoreVertical,
  Building2,
  Copy,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const roleColors: Record<string, string> = {
  TECH: 'bg-blue-500/10 text-blue-500',
  ADMIN: 'bg-purple-500/10 text-purple-500',
  VIEWER: 'bg-slate-500/10 text-slate-400',
  SUPER_ADMIN: 'bg-red-500/10 text-red-500',
};

export default function UsersManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createdUserCreds, setCreatedUserCreds] = useState<{email: string, pass: string} | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc'));
  }, [db]);

  const tenantsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'tenants'), orderBy('name', 'asc'));
  }, [db]);

  const { data: users, isLoading } = useCollection(usersQuery);
  const { data: tenants } = useCollection(tenantsQuery);

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;

    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const tenantId = formData.get('tenantId') as string;
    const tempPassword = Math.random().toString(36).slice(-10).toUpperCase() + "!";

    let secondaryApp;
    try {
      // 1. Crear instancia secundaria de Firebase para crear el usuario en Auth sin cerrar la sesión actual
      const appName = `SecondaryApp-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
      const uid = userCredential.user.uid;

      // Cerrar la sesión de la instancia secundaria inmediatamente
      await signOut(secondaryAuth);

      // 3. Crear el perfil en Firestore con el UID real
      await setDoc(doc(db, 'userProfiles', uid), {
        id: uid,
        email,
        displayName: name,
        role,
        tenantId: role === 'SUPER_ADMIN' ? null : tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCreatedUserCreds({ email, pass: tempPassword });
      setIsDialogOpen(false);
      
      toast({
        title: "Usuario Creado",
        description: `El perfil de ${name} ha sido registrado correctamente.`,
      });
    } catch (error: any) {
      console.error(error);
      let message = "No se pudo crear el usuario.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Este correo electrónico ya está registrado.";
      }
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: message,
      });
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Credenciales copiadas al portapapeles.",
    });
  };

  return (
    <SuperAdminLayout>
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-200">Usuarios Globales</h2>
          <p className="text-slate-500 font-medium">Control centralizado de accesos y permisos del sistema.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 px-6 h-12 shadow-lg shadow-red-900/40">
              <UserPlus className="w-5 h-5" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-white">Crear Nuevo Usuario</DialogTitle>
              <DialogDescription className="text-slate-400">
                Se creará una cuenta en Auth y un perfil en Firestore. Entrega la contraseña al usuario.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" required className="bg-slate-950 border-slate-700" placeholder="Ej: Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Profesional</Label>
                <Input id="email" name="email" type="email" required className="bg-slate-950 border-slate-700" placeholder="ejemplo@hotel.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rol de Sistema</Label>
                  <Select name="role" defaultValue="TECH">
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="TECH">Técnico (TECH)</SelectItem>
                      <SelectItem value="ADMIN">Administrador (ADMIN)</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="VIEWER">Solo Lectura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Asignar Hotel</Label>
                  <Select name="tenantId">
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {tenants?.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>Cancelar</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isCreating}>
                  {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : "Generar Acceso"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Modal for Generated Credentials */}
      <Dialog open={!!createdUserCreds} onOpenChange={() => setCreatedUserCreds(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <DialogTitle className="text-white text-2xl">¡Usuario Creado!</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              Copia estas credenciales. El usuario ya puede entrar al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Email de Acceso</Label>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-bold text-blue-400">{createdUserCreds?.email}</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => copyToClipboard(createdUserCreds?.email || '')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Contraseña Temporal</Label>
                <div className="flex items-center justify-between">
                  <code className="text-lg font-black text-white tracking-widest">{createdUserCreds?.pass}</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => copyToClipboard(createdUserCreds?.pass || '')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white font-bold" onClick={() => setCreatedUserCreds(null)}>
              Entendido, ya las he guardado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-slate-900/50 border-slate-800 text-slate-200 overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-slate-800 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <Input 
              placeholder="Filtrar por nombre o email..." 
              className="pl-10 h-11 bg-slate-950 border-slate-700 text-slate-200" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-slate-800">
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Información Personal</TableHead>
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Hotel Asignado</TableHead>
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14 text-center">Rol</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">Cargando usuarios...</TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500 italic">No hay usuarios registrados.</TableCell></TableRow>
              ) : filteredUsers.map((u) => (
                <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="py-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-slate-700">
                        <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
                          {u.displayName?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{u.displayName}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Building2 className="w-4 h-4 text-slate-600" />
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="text-red-400/80 font-bold text-xs uppercase tracking-tighter">Sistema Global</span>
                      ) : (
                        tenants?.find(t => t.id === u.tenantId)?.name || 'Pendiente'
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("font-black text-[9px] px-2.5 py-0.5 border-none", roleColors[u.role])}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
