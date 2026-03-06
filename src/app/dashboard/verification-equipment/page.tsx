
"use client"

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter,
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
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Hash,
  ClipboardCheck,
  ShieldCheck,
  FlaskConical,
  Thermometer,
  MoreVertical,
  History as HistoryIcon,
  Timer
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, limit, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { VerificationEquipment, EquipmentStatus, VerificationRecord, EquipmentType } from '@/lib/types';
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
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<VerificationEquipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  
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
    const type = formData.get('type') as EquipmentType;
    
    const newEquipment = {
      name: formData.get('name') as string,
      type: type,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      serialNumber: formData.get('serialNumber') as string,
      lastCalibrationDate: formData.get('lastCalibrationDate') as string || null,
      nextCalibrationDate: formData.get('nextCalibrationDate') as string || null,
      expiryDate: formData.get('expiryDate') as string || null,
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

  const handleUpdateCalibration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !selectedEquipment) return;

    const formData = new FormData(e.currentTarget);
    const updateData = {
      lastCalibrationDate: formData.get('lastCalibrationDate') as string,
      nextCalibrationDate: formData.get('nextCalibrationDate') as string,
      updatedAt: serverTimestamp()
    };

    const equipmentRef = doc(db, 'tenants', profile.tenantId, 'verificationEquipment', selectedEquipment.id);
    updateDocumentNonBlocking(equipmentRef, updateData);

    toast({
      title: "Calibración Actualizada",
      description: "Se han guardado las nuevas fechas de control.",
    });
    setIsCalibrationModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !equipmentToDelete) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'verificationEquipment', equipmentToDelete);
    deleteDocumentNonBlocking(ref);
    toast({ 
      title: "Equipo eliminado",
      description: "El registro ha sido retirado permanentemente del inventario."
    });
    setEquipmentToDelete(null);
  };

  const isCalibrationOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const getEquipmentIcon = (type: EquipmentType) => {
    switch (type) {
      case 'PHOTOMETER': return <ClipboardCheck className="w-5 h-5 text-primary" />;
      case 'TURBIDIMETER': return <FlaskConical className="w-5 h-5 text-primary" />;
      case 'THERMOMETER': return <Thermometer className="w-5 h-5 text-primary" />;
      case 'STANDARD_KIT': return <FlaskConical className="w-5 h-5 text-orange-500" />;
      default: return <Settings className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Wrench className="w-6 h-6 md:w-8 md:h-8 text-accent" />
              Gestión de Instrumentación
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Control normativo RD 3/2023 de equipos y patrones de medida.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg w-full sm:w-auto text-white font-bold" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90 w-full sm:w-auto text-white font-bold" asChild>
              <Link href="/dashboard/verifications">
                <ShieldCheck className="w-4 h-4" />
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
                placeholder="Buscar equipo, serie o modelo..." 
                className="pl-10 h-11 bg-white border-slate-200" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {loadingEquip ? (
                <p className="col-span-full text-center py-12">Cargando instrumentación...</p>
              ) : filteredEquipment.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold">No hay equipos registrados en el inventario.</p>
                </div>
              ) : filteredEquipment.map((e) => {
                const isKit = e.type === 'STANDARD_KIT';
                const canVerify = e.type === 'PHOTOMETER' || e.type === 'TURBIDIMETER';
                const overdue = !isKit && isCalibrationOverdue(e.nextCalibrationDate);
                const expired = isKit && isExpired(e.expiryDate);
                
                return (
                  <Card key={e.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    <div className={cn(
                      "h-1.5 w-full",
                      overdue || expired ? "bg-red-500" : e.status === 'ACTIVE' ? "bg-green-500" : "bg-slate-400"
                    )} />
                    <CardHeader className="pb-3 border-b">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            isKit ? "bg-orange-50" : "bg-primary/10"
                          )}>
                            {getEquipmentIcon(e.type)}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-bold line-clamp-1">{e.name}</CardTitle>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate">
                              {e.brand} {e.model}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0" 
                          onClick={() => setEquipmentToDelete(e.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-muted-foreground font-medium uppercase tracking-tighter">
                          <Hash className="w-3 h-3" /> S/N o Lote:
                        </span>
                        <span className="font-bold">{e.serialNumber}</span>
                      </div>
                      
                      <div className={cn(
                        "p-3 rounded-lg border space-y-2",
                        overdue || expired ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
                      )}>
                        {isKit ? (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1.5 font-bold uppercase">
                              <Timer className="w-3 h-3" /> Caducidad Kit:
                            </span>
                            <span className={cn(
                              "font-black px-2 py-0.5 rounded",
                              expired ? "text-red-700 bg-red-100" : "text-slate-700"
                            )}>
                              {e.expiryDate || 'No definida'}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1.5 font-bold uppercase">
                                <Calendar className="w-3 h-3" /> Últ. Calibración:
                              </span>
                              <span className="font-bold">{e.lastCalibrationDate || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1.5 font-bold uppercase">
                                <AlertCircle className="w-3 h-3" /> Próxima cita:
                              </span>
                              <span className={cn(
                                "font-black px-2 py-0.5 rounded",
                                overdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                              )}>
                                {e.nextCalibrationDate || 'Pendiente'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 py-3 flex gap-2 border-t mt-auto">
                      {!isKit ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-[10px] font-bold h-8 uppercase gap-1.5 border-slate-300"
                            onClick={() => {
                              setSelectedEquipment(e);
                              setIsCalibrationModalOpen(true);
                            }}
                          >
                            <HistoryIcon className="w-3 h-3" /> Calibrar
                          </Button>
                          {canVerify && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="flex-1 text-[10px] font-bold h-8 uppercase gap-1.5 bg-accent text-white hover:bg-accent/90"
                              asChild
                            >
                              <Link href={`/dashboard/verifications?equipmentId=${e.id}`}>
                                <ShieldCheck className="w-3 h-3" /> Verificar
                              </Link>
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black px-4",
                            expired ? "bg-red-50 text-red-600 border-red-200" : "bg-orange-50 text-orange-600 border-orange-200"
                          )}>
                            {expired ? 'REEMPLAZAR PATRÓN' : 'CONSUMIBLE ACTIVO'}
                          </Badge>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!equipmentToDelete} onOpenChange={(open) => !open && setEquipmentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                ¿Eliminar equipo del inventario?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará el registro del equipo y su historial de calibraciones asociado. Los registros de verificaciones mensuales ya firmados no se borrarán, pero perderán el vínculo con la ficha técnica del dispositivo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                Eliminar Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Equipment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Instrumentación Técnica</DialogTitle>
              <DialogDescription className="text-xs">Añade equipos de medida o kits de patrones al sistema.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEquipment} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs font-bold uppercase">Tipo de Recurso</Label>
                <Select name="type" defaultValue="PHOTOMETER">
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHOTOMETER">Fotómetro Digital</SelectItem>
                    <SelectItem value="TURBIDIMETER">Turbidímetro</SelectItem>
                    <SelectItem value="THERMOMETER">Termómetro Digital</SelectItem>
                    <SelectItem value="STANDARD_KIT">Kit de Patrones / Referencia</SelectItem>
                    <SelectItem value="OTHER">Otro Equipo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase">Nombre del Equipo / Kit</Label>
                <Input id="name" name="name" required placeholder="Ej: Fotómetro MD200 Piscina" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-xs font-bold uppercase">Marca</Label>
                  <Input id="brand" name="brand" placeholder="Ej: Lovibond" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-xs font-bold uppercase">Modelo</Label>
                  <Input id="model" name="model" placeholder="Ej: MD200" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-xs font-bold uppercase">Nº Serie / Lote</Label>
                  <Input id="serialNumber" name="serialNumber" required placeholder="S/N obligatorio" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-bold uppercase">Estado Inicial</Label>
                  <Select name="status" defaultValue="ACTIVE">
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo / Operativo</SelectItem>
                      <SelectItem value="IN_REPAIR">En Calibración/Reparación</SelectItem>
                      <SelectItem value="RETIRED">Retirado/Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Información de Control Temporal</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastCalibrationDate" className="text-[10px] font-bold uppercase">Últ. Calibración</Label>
                    <Input id="lastCalibrationDate" name="lastCalibrationDate" type="date" className="h-10 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextCalibrationDate" className="text-[10px] font-bold uppercase">Prox. Calibración</Label>
                    <Input id="nextCalibrationDate" name="nextCalibrationDate" type="date" className="h-10 bg-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate" className="text-[10px] font-bold uppercase text-orange-600">Fecha Caducidad (Solo Kits)</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" className="h-10 bg-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase">Notas Técnicas</Label>
                <Input id="notes" name="notes" placeholder="Observaciones adicionales..." className="h-11" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary text-white font-bold px-8">Guardar Registro</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update Calibration Dialog */}
        <Dialog open={isCalibrationModalOpen} onOpenChange={setIsCalibrationModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HistoryIcon className="text-primary w-5 h-5" />
                Registrar Calibración
              </DialogTitle>
              <DialogDescription>
                Actualiza el estado de calibración de: <strong>{selectedEquipment?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCalibration} className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lastCalibrationDate">Fecha Calibración Realizada</Label>
                  <Input 
                    id="lastCalibrationDate" 
                    name="lastCalibrationDate" 
                    type="date" 
                    required 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextCalibrationDate">Próxima Calibración (Vencimiento)</Label>
                  <Input 
                    id="nextCalibrationDate" 
                    name="nextCalibrationDate" 
                    type="date" 
                    required 
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCalibrationModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold">Confirmar Calibración</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-primary uppercase">Resultado</TableHead>
                      <TableHead className="font-bold text-xs text-primary uppercase">Fecha Control</TableHead>
                      <TableHead className="font-bold text-xs text-primary uppercase">Instrumento</TableHead>
                      <TableHead className="font-bold text-xs text-center text-primary uppercase">Certificado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingVerif ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando histórico...</TableCell></TableRow>
                    ) : !verifications || verifications.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No hay registros de verificación mensual firmados.</TableCell></TableRow>
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
                          <div className="flex flex-col">
                            <Badge variant="outline" className="text-[8px] font-black uppercase w-fit">{v.instrumentType}</Badge>
                            {v.equipmentName && <span className="text-[10px] font-bold text-slate-500 mt-1">{v.equipmentName}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-slate-900 text-white text-[8px] font-bold flex items-center gap-1 justify-center whitespace-nowrap px-3">
                            <ShieldCheck className="w-2.5 h-2.5" /> FIRMADO DIGITAL
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
      </div>
    </DashboardLayout>
  );
}
