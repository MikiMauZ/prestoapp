"use client"

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter
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
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Settings,
  Hash,
  ClipboardCheck,
  ShieldCheck
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { VerificationEquipment, EquipmentStatus, VerificationRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function VerificationEquipmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando equipos...</div>}>
      <VerificationEquipmentContent />
    </Suspense>
  );
}

function VerificationEquipmentContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'inventory');
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const equipmentQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'verificationEquipment'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const verificationsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'verifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, profile?.tenantId]);

  const { data: equipment, isLoading: loadingEquip } = useCollection<VerificationEquipment>(equipmentQuery);
  const { data: verifications, isLoading: loadingVerif } = useCollection<VerificationRecord>(verificationsQuery);

  const filteredEquipment = useMemo(() => {
    if (!equipment) return [];
    return equipment.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [equipment, searchTerm]);

  const handleCreateEquipment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId) return;

    const formData = new FormData(e.currentTarget);
    const newEquipment = {
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      serialNumber: formData.get('serialNumber') as string,
      lastCalibrationDate: formData.get('lastCalibrationDate') as string,
      nextCalibrationDate: formData.get('nextCalibrationDate') as string,
      status: formData.get('status') as EquipmentStatus,
      notes: formData.get('notes') as string,
      createdAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'verificationEquipment');
    addDocumentNonBlocking(colRef, newEquipment);

    toast({
      title: "Equipo Registrado",
      description: "El dispositivo ha sido añadido al inventario técnico.",
    });
    setIsDialogOpen(false);
  };

  const handleDeleteEquipment = (id: string) => {
    if (!db || !profile?.tenantId) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'verificationEquipment', id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Equipo eliminado" });
  };

  const isCalibrationOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Wrench className="w-6 h-6 md:w-8 md:h-8 text-accent" />
              Instrumentación
            </h2>
            <p className="text-sm text-muted-foreground">Gestión normativa RD 3/2023 de equipos de medida.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg w-full sm:w-auto text-white" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Nuevo Equipo
            </Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90 w-full sm:w-auto text-white" asChild>
              <Link href="/dashboard/verifications">
                <ClipboardCheck className="w-4 h-4" />
                Nueva Verificación
              </Link>
            </Button>
          </div>
        </div>

        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar equipo..." 
                className="pl-10 h-11 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {loadingEquip ? (
                <p className="col-span-full text-center py-12">Cargando equipos...</p>
              ) : filteredEquipment.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold">No hay equipos registrados.</p>
                </div>
              ) : filteredEquipment.map((e) => {
                const overdue = isCalibrationOverdue(e.nextCalibrationDate);
                return (
                  <Card key={e.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    <div className={cn(
                      "h-1.5 w-full",
                      e.status === 'ACTIVE' ? "bg-green-500" : e.status === 'IN_REPAIR' ? "bg-orange-500" : "bg-slate-400"
                    )} />
                    <CardHeader className="pb-3 border-b">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Settings className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold line-clamp-1">{e.name}</CardTitle>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{e.brand} {e.model}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteEquipment(e.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-muted-foreground font-medium">
                          <Hash className="w-3.5 h-3.5" /> S/N:
                        </span>
                        <span className="font-bold">{e.serialNumber}</span>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-slate-50 border space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> Calibración:
                          </span>
                          <span className="font-bold">{e.lastCalibrationDate || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" /> Próxima cita:
                          </span>
                          <span className={cn(
                            "font-black px-2 py-0.5 rounded",
                            overdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {e.nextCalibrationDate || 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 py-3 flex justify-between items-center border-t">
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase",
                        e.status === 'ACTIVE' ? "text-green-600 border-green-200 bg-green-50" :
                        e.status === 'IN_REPAIR' ? "text-orange-600 border-orange-200 bg-orange-50" :
                        "text-slate-500 border-slate-200 bg-slate-50"
                      )}>
                        {e.status}
                      </Badge>
                      {e.status === 'ACTIVE' && !overdue && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> APTO
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-primary">Resultado</TableHead>
                      <TableHead className="font-bold text-xs text-primary">Fecha Verificación</TableHead>
                      <TableHead className="font-bold text-xs text-primary">Instrumento</TableHead>
                      <TableHead className="font-bold text-xs text-center text-primary">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingVerif ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell></TableRow>
                    ) : !verifications || verifications.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No hay registros firmados.</TableCell></TableRow>
                    ) : verifications.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            v.overallResult === 'PASS' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          )}>
                            {v.overallResult === 'PASS' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs">{v.verificationDate}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">{v.lockedAt ? new Date(v.lockedAt).toLocaleTimeString() : ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] font-black">{v.instrumentType}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-slate-900 text-white text-[8px] font-bold flex items-center gap-1 justify-center whitespace-nowrap">
                            <ShieldCheck className="w-2.5 h-2.5" /> FIRMADO
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Añadir Nuevo Equipo</DialogTitle>
              <DialogDescription className="text-xs">Registra un dispositivo técnico para control de calibraciones.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEquipment} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Nombre del Equipo</Label>
                <Input id="name" name="name" required placeholder="Ej: Fotómetro MD200 Pool" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-xs">Marca</Label>
                  <Input id="brand" name="brand" placeholder="Ej: Lovibond" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-xs">Modelo</Label>
                  <Input id="model" name="model" placeholder="Ej: MD200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-xs">Nº de Serie / S/N</Label>
                  <Input id="serialNumber" name="serialNumber" required placeholder="Obligatorio" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs">Estado Operativo</Label>
                  <Select name="status" defaultValue="ACTIVE">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo / Operativo</SelectItem>
                      <SelectItem value="IN_REPAIR">En Reparación</SelectItem>
                      <SelectItem value="RETIRED">Retirado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastCalibrationDate" className="text-xs">Última Calibración</Label>
                  <Input id="lastCalibrationDate" name="lastCalibrationDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextCalibrationDate" className="text-xs">Próxima Calibración</Label>
                  <Input id="nextCalibrationDate" name="nextCalibrationDate" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs">Notas Técnicas</Label>
                <Input id="notes" name="notes" placeholder="Observaciones adicionales..." />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-xs">Cancelar</Button>
                <Button type="submit" className="bg-primary text-white text-xs">Guardar Dispositivo</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
