
"use client"

import React, { useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
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
  Building2, 
  Plus, 
  Search, 
  MoreVertical,
  MapPin,
  Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function TenantsManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const tenantsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const filteredTenants = React.useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tenants, searchTerm]);

  const handleCreateTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    try {
      const tenantRef = doc(collection(db, 'tenants'));
      await setDoc(tenantRef, {
        id: tenantRef.id,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Hotel Registrado",
        description: `Se ha creado el entorno para ${name} correctamente.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el hotel.",
      });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-200">Hoteles y Organizaciones</h2>
          <p className="text-slate-500 font-medium">Gestión de licencias y entornos multi-tenant.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 px-6 h-12 shadow-lg shadow-red-900/40">
              <Plus className="w-5 h-5" />
              Nuevo Hotel
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-white">Registrar Nuevo Hotel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTenant} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Comercial del Hotel</Label>
                <Input id="name" name="name" required className="bg-slate-950 border-slate-700" placeholder="Ej: Grand Hotel Beach" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">Crear Entorno</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 text-slate-200 overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-slate-800 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <Input 
              placeholder="Buscar por nombre..." 
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
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Nombre del Hotel</TableHead>
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14 text-center">Estado</TableHead>
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Fecha Alta</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">Cargando hoteles...</TableCell></TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500 italic">No hay hoteles registrados.</TableCell></TableRow>
              ) : filteredTenants.map((t) => (
                <TableRow key={t.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{t.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">ID: {t.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-500/10 text-green-500 font-black text-[9px] px-2.5 py-0.5 border-none">
                      ACTIVO
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      {t.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                    </div>
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
