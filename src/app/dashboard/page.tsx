
"use client"

import React, { useMemo, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Droplets, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Plus,
  Activity,
  Package,
  ShoppingCart,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Wrench,
  Loader2,
  Camera,
  X,
  Send,
  Building2,
  User,
  PlayCircle,
  PauseCircle,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where, serverTimestamp, arrayUnion, addDoc, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';
import { OrderItem, LogbookEntry, LogbookStatus, Supplier } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Modals state
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Form states for modals
  const [isUploading, setIsUploading] = useState(false);
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualItems, setManualItems] = useState<OrderItem[]>([{ name: '', quantity: 1, unit: 'UNIDADES' }]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('NONE');

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: loadingProfile } = useDoc(userProfileRef);

  // Queries
  const verificationsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'verifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [db, profile?.tenantId]);

  const incidentsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'logbook'),
      where('status', 'not-in', ['RESUELTO', 'CERRADO']),
      orderBy('status'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [db, profile?.tenantId]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'inventory'));
  }, [db, profile?.tenantId]);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'orders'),
      where('status', 'in', ['DRAFT', 'SENT'])
    );
  }, [db, profile?.tenantId]);

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'suppliers'), orderBy('name', 'asc'));
  }, [db, profile?.tenantId]);

  const { data: recentVerifications } = useCollection(verificationsQuery);
  const { data: pendingIncidents, isLoading: loadingIncidents } = useCollection<LogbookEntry>(incidentsQuery);
  const { data: inventoryItems } = useCollection(inventoryQuery);
  const { data: activeOrders } = useCollection(ordersQuery);
  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);

  const lastVerification = recentVerifications?.[0];
  const selectedEntry = useMemo(() => pendingIncidents?.find(e => e.id === selectedEntryId), [pendingIncidents, selectedEntryId]);

  const lowStockItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter((item: any) => item.currentStock <= item.minStock);
  }, [inventoryItems]);

  const stats = [
    { 
      label: 'Estado Sanitario', 
      value: lastVerification ? (lastVerification.overallResult === 'PASS' ? 'APTO' : 'NO APTO') : 'PENDIENTE', 
      sub: lastVerification ? `Control: ${lastVerification.verificationDate}` : 'Sin registros hoy',
      icon: Droplets, 
      color: lastVerification?.overallResult === 'PASS' ? 'text-green-600' : lastVerification?.overallResult === 'FAIL' ? 'text-red-600' : 'text-blue-600', 
      bg: lastVerification?.overallResult === 'PASS' ? 'bg-green-50' : 'bg-blue-50', 
      bar: lastVerification?.overallResult === 'PASS' ? 'bg-green-600' : 'bg-red-600',
      href: '/dashboard/pool-protocols?tab=water-inventory'
    },
    { 
      label: 'Incidencias Activas', 
      value: pendingIncidents?.length.toString() || '0', 
      sub: 'Atención necesaria',
      icon: MessageSquare, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      bar: 'bg-blue-600',
      href: '/dashboard/logbook'
    },
    { 
      label: 'Alertas de Stock', 
      value: lowStockItems.length.toString(), 
      sub: lowStockItems.length > 0 ? 'Reponer urgente' : 'Almacén OK',
      icon: Package, 
      color: lowStockItems.length > 0 ? 'text-orange-600' : 'text-slate-600', 
      bg: lowStockItems.length > 0 ? 'bg-orange-50' : 'bg-slate-50', 
      bar: 'bg-orange-500',
      href: '/dashboard/inventory'
    },
    { 
      label: 'Pedidos', 
      value: activeOrders?.length.toString() || '0', 
      sub: 'En curso',
      icon: ShoppingCart, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      bar: 'bg-accent',
      href: '/dashboard/orders'
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setEntryPhotos(prev => [...prev, ...urls]);
      toast({ title: "Evidencias", description: "Imágenes cargadas correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Fallo al subir imágenes." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;
    const formData = new FormData(e.currentTarget);
    const newEntry = {
      type: formData.get('type'),
      shift: formData.get('shift'),
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      status: 'ABIERTO',
      relatedArea: formData.get('area'),
      attachments: entryPhotos,
      createdBy: profile.displayName || user.email,
      createdById: user.uid,
      createdAt: serverTimestamp(),
      updates: []
    };
    await addDoc(collection(db, 'tenants', profile.tenantId, 'logbook'), newEntry);
    toast({ title: "Incidencia Creada" });
    setEntryPhotos([]);
    setIsIncidentModalOpen(false);
  };

  const handleCreateOrder = async () => {
    if (!db || !profile?.tenantId || !user) return;
    const validItems = manualItems.filter(i => i.name.trim() !== '');
    if (validItems.length === 0) return;
    const supplier = suppliers?.find(s => s.id === selectedSupplierId);
    const newOrder = {
      status: 'DRAFT',
      items: validItems,
      supplierId: selectedSupplierId === 'NONE' ? null : selectedSupplierId,
      supplierName: supplier?.name || 'Varios / Sin especificar',
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'tenants', profile.tenantId, 'orders'), newOrder);
    toast({ title: "Borrador de Pedido Creado" });
    setIsOrderModalOpen(false);
    setManualItems([{ name: '', quantity: 1, unit: 'UNIDADES' }]);
  };

  const handleStatusChange = (entryId: string, newStatus: LogbookStatus) => {
    if (!db || !profile?.tenantId || !user) return;
    const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', entryId);
    updateDoc(entryRef, { 
      status: newStatus,
      updates: arrayUnion({
        text: `Estado cambiado a ${newStatus}`,
        userName: profile.displayName || user.email || 'Técnico',
        userId: user.uid,
        timestamp: new Date(),
        statusAtTime: newStatus
      })
    });
    toast({ title: "Estado Actualizado" });
  };

  const handleAddComment = () => {
    if (!db || !profile?.tenantId || !user || !selectedEntryId || !commentText.trim()) return;
    const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', selectedEntryId);
    updateDoc(entryRef, {
      updates: arrayUnion({
        text: commentText,
        userName: profile.displayName || user.email || 'Técnico',
        userId: user.uid,
        timestamp: new Date(),
        statusAtTime: selectedEntry?.status || 'ABIERTO'
      })
    });
    setCommentText('');
    toast({ title: "Comentario registrado" });
  };

  if (loadingProfile) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sincronizando Dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-primary uppercase">Panel de Control</h2>
            <p className="text-muted-foreground font-medium">
              Bienvenido, {profile?.displayName || 'Técnico'}. Resumen operativo de {profile?.tenantName || 'tu hotel'}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none gap-2 border-primary text-primary font-bold" onClick={() => setIsIncidentModalOpen(true)}>
              <Plus className="w-4 h-4" /> Nueva Incidencia
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none gap-2 border-accent text-accent font-bold" onClick={() => setIsOrderModalOpen(true)}>
              <ShoppingCart className="w-4 h-4" /> Nuevo Pedido
            </Button>
            <Button className="flex-1 md:flex-none gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20" asChild>
              <Link href="/dashboard/verifications">
                <ShieldCheck className="w-4 h-4" /> Nuevo Control
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden cursor-pointer h-full">
                <div className={cn("h-1.5 w-full", stat.bar)} />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {stat.label}
                  </CardTitle>
                  <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.value}</div>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase truncate">{stat.sub}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-xl flex flex-col overflow-hidden bg-white ring-1 ring-slate-200">
              <CardHeader className="bg-slate-50 border-b py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter text-primary">
                      <ClipboardList className="w-6 h-6 text-accent" />
                      Logbook Operativo
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-1">Intervenciones técnicas urgentes y correctivos.</CardDescription>
                  </div>
                  {pendingIncidents && pendingIncidents.length > 0 && (
                    <Badge variant="destructive" className="px-3 py-1 font-black">
                      {pendingIncidents.length} PENDIENTES
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {loadingIncidents ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl" />)}
                    </div>
                  ) : pendingIncidents && pendingIncidents.length > 0 ? (
                    <div className="space-y-3">
                      {pendingIncidents.map((inc) => {
                        const lastUpdate = inc.updates?.[inc.updates.length - 1];
                        return (
                          <div 
                            key={inc.id} 
                            onClick={() => setSelectedEntryId(inc.id)}
                            className={cn(
                              "p-5 border-l-4 rounded-2xl flex justify-between items-start transition-all bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-300 cursor-pointer",
                              inc.priority === 'CRITICA' ? "border-l-red-500" : "border-l-blue-400"
                            )}
                          >
                            <div className="max-w-[85%] space-y-2">
                              <div className="flex items-center gap-3">
                                <Badge className={cn(
                                  "text-[9px] font-black uppercase px-2",
                                  inc.priority === 'CRITICA' ? "bg-red-600" : "bg-primary"
                                )}>{inc.priority}</Badge>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{inc.relatedArea || 'Área General'}</span>
                              </div>
                              <h4 className="font-bold text-base text-slate-900 leading-tight">{inc.title}</h4>
                              
                              {lastUpdate ? (
                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-dashed text-[11px] text-slate-600">
                                  <span className="font-black text-primary uppercase mr-2">{lastUpdate.userName}:</span>
                                  <span className="italic">"{lastUpdate.text}"</span>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic line-clamp-1">"{inc.description}"</p>
                              )}

                              <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground font-bold uppercase">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> 
                                  {inc.createdAt?.toDate ? inc.createdAt.toDate().toLocaleString() : 'Reciente'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5" /> 
                                  {inc.status}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent/10 hover:text-accent">
                              <ArrowRight className="w-5 h-5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-16 text-center border-2 border-dashed rounded-[2rem] bg-slate-50/50">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tight">Sin incidencias abiertas</p>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Todas las averías registradas han sido resueltas.</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-5 border-t flex justify-between items-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sincronización en tiempo real activa</p>
                <Button variant="link" size="sm" className="text-xs font-black text-accent p-0 h-auto gap-1" asChild>
                  <Link href="/dashboard/logbook">Ver historial completo <ArrowRight className="w-3.5 h-3.5" /></Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm overflow-hidden ring-1 ring-slate-200">
              <CardHeader className="bg-white border-b pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
                  <Activity className="w-5 h-5 text-accent" />
                  Estado Sanitario
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Verificación RD 3/2023</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!lastVerification ? (
                  <div className="p-6 text-center border-2 border-dashed rounded-xl bg-slate-50 space-y-3">
                    <Droplets className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-[10px] text-muted-foreground font-bold italic leading-tight">No hay controles registrados recientemente.</p>
                    <Button variant="outline" size="sm" className="w-full text-[10px] font-black h-8 text-accent uppercase" asChild>
                      <Link href="/dashboard/verifications">Iniciar Control</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={cn(
                      "p-5 rounded-2xl text-center space-y-1 shadow-sm",
                      lastVerification.overallResult === 'PASS' ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Resultado Global</p>
                      <div className={cn(
                        "text-4xl font-black",
                        lastVerification.overallResult === 'PASS' ? "text-green-600" : "text-red-600"
                      )}>
                        {lastVerification.overallResult === 'PASS' ? 'APTO' : 'NO APTO'}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1">{lastVerification.verificationDate}</p>
                    </div>
                    
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground font-bold uppercase">Firma Digital:</span>
                        <span className="flex items-center gap-1 text-green-600 font-black"><ShieldCheck className="w-3.5 h-3.5" /> VALIDADA</span>
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" className="w-full text-[10px] font-black h-10 text-primary uppercase tracking-widest" asChild>
                      <Link href="/dashboard/verification-equipment?tab=history">Detalles del Control</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {lowStockItems.length > 0 && (
              <Card className="border-none shadow-sm border-orange-100 bg-orange-50/30 ring-1 ring-orange-100">
                <CardHeader className="pb-3 border-b border-orange-100/50">
                  <CardTitle className="text-sm font-black text-orange-600 flex items-center gap-2 uppercase tracking-widest">
                    <AlertTriangle className="w-4 h-4" /> Alerta de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {lowStockItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-orange-100 shadow-sm">
                      <div className="max-w-[70%] space-y-0.5">
                        <p className="text-xs font-black text-slate-900 truncate uppercase">{item.name}</p>
                        <p className="text-[10px] font-bold text-orange-600">Quedan: {item.currentStock} {item.unit}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50" asChild>
                        <Link href="/dashboard/inventory"><Plus className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  ))}
                  <Button variant="link" size="sm" className="w-full text-[10px] font-black text-orange-700 p-0 h-auto uppercase tracking-tighter" asChild>
                    <Link href="/dashboard/inventory">Ver todo el almacén <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* NEW INCIDENT MODAL */}
      <Dialog open={isIncidentModalOpen} onOpenChange={setIsIncidentModalOpen}>
        <DialogContent className="sm:max-w-[500px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Nueva Entrada Logbook</DialogTitle>
            <DialogDescription>Registra una avería o tarea técnica desde el panel principal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIncident} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select name="type" defaultValue="INCIDENCIA">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCIDENCIA">Incidencia</SelectItem>
                    <SelectItem value="TAREA">Tarea</SelectItem>
                    <SelectItem value="CAMBIO_TURNO">Cambio Turno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select name="priority" defaultValue="MEDIA">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="CRITICA">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ubicación / Área</Label>
              <Input name="area" placeholder="Ej: Cocina, Habitación 302..." />
            </div>
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input name="title" required placeholder="Resumen corto..." />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea name="description" rows={3} placeholder="Detalles de la incidencia..." />
            </div>
            <div className="space-y-2">
              <Label>Fotos / Evidencias</Label>
              <div className="flex flex-wrap gap-2">
                {entryPhotos.map((url, i) => (
                  <div key={i} className="relative w-12 h-12 rounded border overflow-hidden group">
                    <Image src={url} alt="Ref" fill className="object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setEntryPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-12 h-12 rounded border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:text-accent hover:border-accent transition-all"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span className="text-[8px] font-bold uppercase">Añadir</span>
                    </>
                  )}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsIncidentModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isUploading}>Guardar Incidencia</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NEW ORDER MODAL */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-[600px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Nuevo Pedido Técnico</DialogTitle>
            <DialogDescription>Genera un borrador de pedido para suministros.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin especificar</SelectItem>
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><Label>Artículos</Label></div>
              {manualItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Producto..." 
                    className="flex-1" 
                    value={item.name} 
                    onChange={e => {
                      const upd = [...manualItems];
                      upd[idx].name = e.target.value;
                      setManualItems(upd);
                    }}
                  />
                  <Input 
                    type="number" 
                    className="w-20" 
                    value={item.quantity} 
                    onChange={e => {
                      const upd = [...manualItems];
                      upd[idx].quantity = parseFloat(e.target.value) || 0;
                      setManualItems(upd);
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setManualItems(manualItems.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setManualItems([...manualItems, { name: '', quantity: 1, unit: 'UNIDADES' }])}>
                + Añadir Fila
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOrderModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateOrder}>Crear Borrador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INCIDENT DETAIL MODAL */}
      <Dialog open={!!selectedEntryId} onOpenChange={() => setSelectedEntryId(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
          {selectedEntry && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className={cn(selectedEntry.priority === 'CRITICA' ? "bg-red-600" : "bg-primary")}>{selectedEntry.priority}</Badge>
                    <DialogTitle className="text-2xl font-bold mt-2">{selectedEntry.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">{selectedEntry.type}</p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border italic text-sm">
                  "{selectedEntry.description}"
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Historial de Trabajo</p>
                  <div className="space-y-3">
                    {selectedEntry.updates && selectedEntry.updates.length > 0 ? (
                      selectedEntry.updates.map((update, idx) => (
                        <div key={idx} className="flex gap-2 text-xs bg-white p-2 rounded border">
                          <div className="font-black text-primary min-w-[80px]">{update.userName}:</div>
                          <div className="flex-1">{update.text}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] italic text-muted-foreground">Sin comentarios registrados.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Input 
                    placeholder="Añadir actualización rápida..." 
                    className="text-xs h-9"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button size="icon" className="bg-accent h-9 w-9 shrink-0" onClick={handleAddComment}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6 pt-0 border-t flex gap-2 justify-end bg-slate-50/50">
                {selectedEntry.status !== 'RESUELTO' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(selectedEntry.id, 'EN_PROGRESO')}>
                      <PlayCircle className="w-4 h-4 mr-2" /> Continuar
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(selectedEntry.id, 'RESUELTO')}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Resolver
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedEntryId(null)}>Cerrar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
