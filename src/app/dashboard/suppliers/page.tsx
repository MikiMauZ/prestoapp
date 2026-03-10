
"use client"

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
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
  Contact, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Building2,
  MoreVertical,
  Trash2,
  ExternalLink,
  Tag
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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Supplier } from '@/lib/types';

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'suppliers'),
      orderBy('name', 'asc')
    );
  }, [db, profile?.tenantId]);

  const { data: suppliers, isLoading: loading } = useCollection<Supplier>(suppliersQuery);

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleCreateSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId) return;

    const formData = new FormData(e.currentTarget);
    const newSupplier = {
      name: formData.get('name') as string,
      contactPerson: formData.get('contactPerson') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      category: formData.get('category') as string,
      notes: formData.get('notes') as string,
      createdAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'suppliers');
    addDocumentNonBlocking(colRef, newSupplier);

    toast({ title: "Proveedor guardado", description: "El contacto ha sido añadido al catálogo técnico." });
    setIsAddDialogOpen(false);
  };

  const handleDeleteSupplier = (id: string) => {
    if (!db || !profile?.tenantId) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'suppliers', id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Proveedor eliminado" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Contact className="w-8 h-8 text-accent" />
              Agenda de Proveedores
            </h2>
            <p className="text-muted-foreground font-medium">Gestión de contactos técnicos y suministros externos.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Registrar Proveedor</DialogTitle>
                <DialogDescription>Añade un nuevo contacto técnico al catálogo del hotel.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSupplier} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Comercial / Empresa</Label>
                  <Input id="name" name="name" required placeholder="Ej: Pedrosa Químicos S.L." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Persona de Contacto</Label>
                    <Input id="contactPerson" name="contactPerson" placeholder="Ej: Juan Pérez" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría / Especialidad</Label>
                    <Input id="category" name="category" placeholder="Ej: Químicos Piscina" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" placeholder="+34 ..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="comercial@empresa.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas</Label>
                  <Textarea id="notes" name="notes" placeholder="Horarios de entrega, pedidos mínimos, etc." />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary">Guardar Contacto</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre, categoría o contacto..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p>Cargando proveedores...</p>
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-muted-foreground italic">No se han encontrado proveedores.</p>
          ) : filteredSuppliers.map((s) => (
            <Card key={s.id} className="border-none shadow-sm hover:shadow-md transition-all group">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{s.name}</CardTitle>
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-tighter">
                        {s.category || 'General'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteSupplier(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {s.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{s.contactPerson}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${s.phone}`} className="hover:text-primary hover:underline">{s.phone}</a>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${s.email}`} className="hover:text-primary hover:underline truncate">{s.email}</a>
                  </div>
                )}
                {s.notes && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs italic text-slate-600 border border-dashed">
                    {s.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
