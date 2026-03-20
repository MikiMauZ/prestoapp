
"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Loader2,
  Camera,
  X,
  Send,
  Building2,
  Trash2,
  Bell,
  BellRing,
  CheckSquare,
  Square,
  Calendar as CalendarIcon,
  LayoutGrid,
  ListFilter,
  Settings2,
  CalendarDays,
  MapPin,
  Timer,
  Repeat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where, serverTimestamp, arrayUnion, addDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
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
import { Order, LogbookEntry, LogbookStatus, Reminder, ReminderFrequency, Supplier, OrderItem, CalendarEvent } from '@/lib/types';
import { deleteDocumentNonBlocking } from '@/firebase';
import { format, isAfter, startOfToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 0 },
];

const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT19vX29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29fb29f";

// Component for Countdown Timer
function CountdownItem({ reminder, onComplete }: { reminder: Reminder, onComplete: (r: Reminder) => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const target = reminder.timerTargetAt?.toDate ? reminder.timerTargetAt.toDate() : null;
    if (!target) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('EXPIRADO');
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reminder]);

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all",
      isExpired ? "bg-red-50 border-red-200 animate-pulse shadow-md ring-1 ring-red-200" : "bg-white border-slate-100 shadow-sm"
    )}>
      <button onClick={() => onComplete(reminder)} className={cn("shrink-0", isExpired ? "text-red-600 hover:scale-110 transition-transform" : "text-slate-300 hover:text-accent")}>
        <CheckSquare className="w-6 h-6" />
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold truncate", isExpired && "text-red-900")}>{reminder.title}</p>
        <p className={cn("text-[10px] font-black uppercase tracking-widest", isExpired ? "text-red-600" : "text-accent")}>
          {timeLeft}
        </p>
      </div>
      <Timer className={cn("w-4 h-4 shrink-0", isExpired ? "text-red-500" : "text-slate-200")} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Modals state
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isMaterialsBoardOpen, setIsMaterialsBoardOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Stop Timer Choice
  const [timerToStop, setTimerToStop] = useState<Reminder | null>(null);

  // Form states for reminders
  const [remFreq, setRemFreq] = useState<ReminderFrequency>('DIARIO');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<string>('');
  const [timerHours, setTimerHours] = useState<string>('1');
  const [timerMinutes, setTimerMinutes] = useState<string>('0');

  // Form states for logbook
  const [isUploading, setIsUploading] = useState(false);
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for New Order
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('NONE');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ name: '', quantity: 1, unit: 'UNIDADES' }]);
  
  // Audio Ref
  const alertShownRef = useRef(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: loadingProfile } = useDoc(userProfileRef);

  // Queries
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

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'orders'),
      where('status', 'in', ['DRAFT', 'SENT']),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const remindersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'reminders'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'suppliers'), orderBy('name', 'asc'));
  }, [db, profile?.tenantId]);

  const schedulingQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'scheduling'),
      where('date', '>=', format(startOfToday(), 'yyyy-MM-dd')),
      orderBy('date', 'asc'),
      limit(5)
    );
  }, [db, profile?.tenantId]);

  const { data: pendingIncidents, isLoading: loadingIncidents } = useCollection<LogbookEntry>(incidentsQuery);
  const { data: inventoryItems } = useCollection(inventoryQuery);
  const { data: activeOrders, isLoading: loadingOrders } = useCollection<Order>(activeOrdersQuery);
  const { data: reminders, isLoading: loadingReminders } = useCollection<Reminder>(remindersQuery);
  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);
  const { data: upcomingEvents } = useCollection<CalendarEvent>(schedulingQuery);

  const selectedEntry = useMemo(() => {
    return pendingIncidents?.find(e => e.id === selectedEntryId);
  }, [pendingIncidents, selectedEntryId]);

  const lowStockItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter((item: any) => item.currentStock <= item.minStock);
  }, [inventoryItems]);

  const flattenedMaterials = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.flatMap(order => 
      order.items.map(item => ({
        ...item,
        orderId: order.id,
        supplierName: order.supplierName,
        status: order.status,
        createdAt: order.createdAt
      }))
    );
  }, [activeOrders]);

  const todaysReminders = useMemo(() => {
    if (!reminders) return [];
    const now = new Date();
    const todayNum = now.getDay();
    const todayStr = format(now, 'yyyy-MM-dd');

    return reminders.filter(r => {
      if (!r.isActive && r.frequency !== 'TEMPORIZADOR') return false;
      if (r.frequency === 'TEMPORIZADOR' && r.isActive) return true;
      if (r.frequency === 'DIARIO') return true;
      if (r.frequency === 'PUNTUAL') return true;
      if (r.frequency === 'SEMANAL') return r.daysOfWeek?.includes(todayNum);
      if (r.frequency === 'FECHA_ESPECIFICA') return r.specificDate === todayStr;
      if (r.frequency === 'MENSUAL') {
        const createdDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
        return createdDate.getDate() === now.getDate();
      }
      return false;
    });
  }, [reminders]);

  const inactiveTimers = useMemo(() => {
    if (!reminders) return [];
    return reminders.filter(r => r.frequency === 'TEMPORIZADOR' && !r.isActive);
  }, [reminders]);

  const pendingRemindersCount = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return todaysReminders.filter(r => {
      if (r.frequency === 'TEMPORIZADOR') return true;
      const lastDone = r.lastCompletedAt?.toDate ? format(r.lastCompletedAt.toDate(), 'yyyy-MM-dd') : '';
      return lastDone !== today;
    }).length;
  }, [todaysReminders]);

  useEffect(() => {
    if (!loadingReminders && todaysReminders.length > 0 && pendingRemindersCount > 0 && !alertShownRef.current) {
      alertShownRef.current = true;
      toast({ title: "Tareas de Hoy Pendientes", description: `Tienes ${pendingRemindersCount} recordatorios sin completar.` });
      try {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }, [loadingReminders, todaysReminders, pendingRemindersCount, toast]);

  const handleToggleReminder = (reminder: Reminder) => {
    if (!db || !profile?.tenantId) return;
    
    if (reminder.frequency === 'TEMPORIZADOR') {
      setTimerToStop(reminder);
      return;
    }

    const reminderRef = doc(db, 'tenants', profile.tenantId, 'reminders', reminder.id);
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastDone = reminder.lastCompletedAt?.toDate ? format(reminder.lastCompletedAt.toDate(), 'yyyy-MM-dd') : '';
    if (lastDone === today) return;
    
    updateDoc(reminderRef, {
      lastCompletedAt: serverTimestamp(),
      isActive: reminder.frequency === 'PUNTUAL' || reminder.frequency === 'FECHA_ESPECIFICA' ? false : true
    });
    toast({ title: "Completado", description: reminder.title });
  };

  const handleStopTimerAction = async (action: 'DELETE' | 'SAVE') => {
    if (!db || !profile?.tenantId || !timerToStop) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'reminders', timerToStop.id);

    if (action === 'DELETE') {
      await deleteDoc(ref);
      toast({ title: "Temporizador finalizado y borrado" });
    } else {
      await updateDoc(ref, { isActive: false, lastCompletedAt: serverTimestamp() });
      toast({ title: "Temporizador guardado para reusar" });
    }
    setTimerToStop(null);
  };

  const handleRestartTimer = async (reminder: Reminder) => {
    if (!db || !profile?.tenantId || !reminder.timerDurationMinutes) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'reminders', reminder.id);
    
    const now = new Date();
    now.setMinutes(now.getMinutes() + reminder.timerDurationMinutes);
    
    await updateDoc(ref, {
      isActive: true,
      timerTargetAt: Timestamp.fromDate(now),
      updatedAt: serverTimestamp()
    });
    toast({ title: "Temporizador Reiniciado", description: reminder.title });
  };

  const handleCreateIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;
    const formData = new FormData(e.currentTarget);
    const newEntry = {
      type: 'INCIDENCIA',
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
    toast({ title: "Comentario Añadido" });
  };

  const handleSaveOrder = async () => {
    if (!db || !profile?.tenantId || !user) return;
    const validItems = orderItems.filter(i => i.name.trim() !== '');
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
    toast({ title: "Pedido Registrado" });
    setIsNewOrderModalOpen(false);
    setOrderItems([{ name: '', quantity: 1, unit: 'UNIDADES' }]);
  };

  if (loadingProfile) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
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
            <p className="text-muted-foreground font-medium">Bienvenido, {profile?.displayName || 'Técnico'}.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none gap-2 border-primary text-primary font-bold" onClick={() => setIsIncidentModalOpen(true)}>
              <Plus className="w-4 h-4" /> Nueva Incidencia
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none gap-2 border-accent text-accent font-bold" onClick={() => setIsMaterialsBoardOpen(true)}>
              <LayoutGrid className="w-4 h-4" /> Pizarra Pedidos
            </Button>
            <Button className="flex-1 md:flex-none gap-2 bg-primary hover:bg-primary/90 shadow-lg text-white font-bold" onClick={() => setIsNewOrderModalOpen(true)}>
              <ShoppingCart className="w-4 h-4" /> Nuevo Pedido
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-xl overflow-hidden ring-1 ring-slate-200">
              <CardHeader className="bg-slate-50 border-b py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter text-primary">
                      <ClipboardList className="w-6 h-6 text-accent" />
                      Logbook Operativo
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-1">Intervenciones técnicas urgentes.</CardDescription>
                  </div>
                  {pendingIncidents && pendingIncidents.length > 0 && <Badge variant="destructive">{pendingIncidents.length} PENDIENTES</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {loadingIncidents ? <Loader2 className="animate-spin mx-auto my-10" /> : pendingIncidents && pendingIncidents.length > 0 ? (
                    pendingIncidents.map((inc) => (
                      <div key={inc.id} onClick={() => setSelectedEntryId(inc.id)} className="p-4 border-l-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-primary flex justify-between items-center bg-white">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-[8px] font-black">{inc.priority}</Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{inc.relatedArea || 'General'}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{inc.title}</h4>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center italic text-muted-foreground">Sin incidencias abiertas.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg ring-1 ring-slate-200 overflow-hidden bg-white">
              <CardHeader className="bg-slate-900 text-white pb-4">
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-accent" /> Próximas Citas Técnicas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                    <div key={event.id} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200">
                        <span className="text-[10px] font-black uppercase text-primary leading-none">{format(parseISO(event.date), 'MMM', { locale: es })}</span>
                        <span className="text-xl font-black text-slate-900 leading-tight">{format(parseISO(event.date), 'dd')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", event.color)} />
                          <h4 className="font-bold text-sm text-slate-900 truncate uppercase">{event.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-muted-foreground uppercase">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.startTime} - {event.endTime}</span>
                          {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <Link href="/dashboard/scheduling"><ArrowRight className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  )) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <CalendarIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-bold italic">No hay eventos próximos.</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-3 border-t">
                <Button variant="link" className="w-full text-[10px] font-black uppercase text-primary" asChild>
                  <Link href="/dashboard/scheduling">Abrir Calendario Completo</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={cn("border-none shadow-sm overflow-hidden ring-1", pendingRemindersCount > 0 ? "ring-red-200 bg-red-50/10" : "ring-slate-200 bg-white")}>
              <CardHeader className="bg-white border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
                    {pendingRemindersCount > 0 ? <BellRing className="w-5 h-5 text-red-500 animate-bounce" /> : <Bell className="w-5 h-5 text-accent" />} Recordatorios HOY
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsReminderModalOpen(true)}><Plus className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-3">
                  {todaysReminders && todaysReminders.length > 0 ? todaysReminders.map((rem) => {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    const lastDone = rem.lastCompletedAt?.toDate ? format(rem.lastCompletedAt.toDate(), 'yyyy-MM-dd') : '';
                    const isCompletedToday = lastDone === today;
                    
                    if (rem.frequency === 'TEMPORIZADOR') {
                      return <CountdownItem key={rem.id} reminder={rem} onComplete={handleToggleReminder} />;
                    }

                    return (
                      <div key={rem.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all", isCompletedToday ? "bg-green-50/50 border-green-100 opacity-60" : "bg-white border-slate-100 shadow-sm")}>
                        <button onClick={() => handleToggleReminder(rem)} className={isCompletedToday ? "text-green-600" : "text-slate-300 hover:text-primary transition-colors"}>
                          <CheckSquare className="w-6 h-6" />
                        </button>
                        <p className={cn("text-xs font-bold truncate", isCompletedToday && "line-through text-slate-400")}>{rem.title}</p>
                      </div>
                    );
                  }) : <p className="text-center text-xs italic text-muted-foreground py-4">Nada pendiente hoy.</p>}
                </div>

                {inactiveTimers.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <Timer className="w-3 h-3" /> Temporizadores Guardados
                    </p>
                    {inactiveTimers.map((rem) => (
                      <div key={rem.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-slate-700">{rem.title}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Duración: {rem.timerDurationMinutes} min</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-accent hover:bg-accent/10" 
                          onClick={() => handleRestartTimer(rem)}
                          title="Reiniciar Temporizador"
                        >
                          <Repeat className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t p-3">
                <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase text-muted-foreground" asChild><Link href="/dashboard/reminders">Gestionar Todo</Link></Button>
              </CardFooter>
            </Card>

            {lowStockItems.length > 0 && (
              <Card className="border-none shadow-sm bg-orange-50/30 ring-1 ring-orange-100">
                <CardHeader className="pb-3 border-b border-orange-100/50">
                  <CardTitle className="text-sm font-black text-orange-600 flex items-center gap-2 uppercase">
                    <AlertTriangle className="w-4 h-4" /> Alerta de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {lowStockItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-orange-100">
                      <p className="text-[11px] font-black truncate uppercase pr-2">{item.name}</p>
                      <Badge variant="outline" className="text-[9px] bg-orange-50 border-none">{item.currentStock} {item.unit}</Badge>
                    </div>
                  ))}
                  <Button variant="link" className="w-full text-[10px] font-black text-orange-700" asChild><Link href="/dashboard/inventory">Ver Almacén <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* PIZARRA GLOBAL DE PEDIDOS */}
      <Dialog open={isMaterialsBoardOpen} onOpenChange={setIsMaterialsBoardOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black uppercase flex items-center gap-3"><LayoutGrid className="w-6 h-6 text-accent" /> Pizarra de Pedidos</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-2">
            {flattenedMaterials.length > 0 ? flattenedMaterials.map((material, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                  <Badge className={cn("text-[9px] font-black", material.status === 'SENT' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>{material.status === 'SENT' ? 'ENVIADO' : 'BORRADOR'}</Badge>
                  <div><p className="font-bold text-slate-900">{material.name}</p><p className="text-[9px] font-bold text-muted-foreground uppercase">{material.supplierName || 'Varios'}</p></div>
                </div>
                <div className="text-xl font-black text-primary">{material.quantity} <span className="text-xs text-muted-foreground uppercase">{material.unit}</span></div>
              </div>
            )) : <div className="text-center py-20 italic">No hay materiales en curso.</div>}
          </div>
          <DialogFooter className="p-4 bg-white border-t"><Button variant="ghost" onClick={() => setIsMaterialsBoardOpen(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW ORDER MODAL */}
      <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-accent" /> Registrar Pedido</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Proveedor..." /></SelectTrigger>
                <SelectContent><SelectItem value="NONE">Varios</SelectItem>{suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-white p-3 rounded-xl border">
                  <div className="flex-1 space-y-1"><Label className="text-[10px]">Producto</Label><Input value={item.name} onChange={(e) => { const updated = [...orderItems]; updated[idx].name = e.target.value; setOrderItems(updated); }} className="h-9" /></div>
                  <div className="w-24 space-y-1"><Label className="text-[10px]">Cant.</Label><Input type="number" value={item.quantity} onChange={(e) => { const updated = [...orderItems]; updated[idx].quantity = parseFloat(e.target.value) || 0; setOrderItems(updated); }} className="h-9" /></div>
                  <Button variant="ghost" size="icon" className="text-red-500 h-9" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} disabled={orderItems.length === 1}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setOrderItems([...orderItems, { name: '', quantity: 1, unit: 'UNIDADES' }])}><Plus className="w-4 h-4 mr-2" /> Añadir Fila</Button>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t"><Button className="bg-primary px-8 font-bold text-white" onClick={handleSaveOrder}>CREAR BORRADOR</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STOP TIMER CHOICE DIALOG */}
      <Dialog open={!!timerToStop} onOpenChange={() => setTimerToStop(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Temporizador Finalizado
            </DialogTitle>
            <DialogDescription>
              Has completado la tarea: <strong>{timerToStop?.title}</strong>. ¿Qué deseas hacer con este aviso?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-4">
            <Button 
              className="bg-slate-100 text-slate-900 hover:bg-slate-200 border-none font-bold py-6"
              onClick={() => handleStopTimerAction('SAVE')}
            >
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-2"><Repeat className="w-4 h-4" /> COMPLETAR Y GUARDAR</span>
                <span className="text-[9px] font-normal opacity-60">Quedará en la lista para volver a usarlo</span>
              </div>
            </Button>
            <Button 
              variant="destructive" 
              className="font-bold py-6"
              onClick={() => handleStopTimerAction('DELETE')}
            >
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> COMPLETAR Y BORRAR</span>
                <span className="text-[9px] font-normal opacity-60">Se eliminará definitivamente el aviso</span>
              </div>
            </Button>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setTimerToStop(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INCIDENT DETAIL MODAL */}
      <Dialog open={!!selectedEntryId} onOpenChange={() => setSelectedEntryId(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          {selectedEntry && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className={cn(selectedEntry.priority === 'CRITICA' ? "bg-red-600" : "bg-primary")}>{selectedEntry.priority}</Badge>
                    <DialogTitle className="text-2xl font-bold mt-2">{selectedEntry.title}</DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border italic text-sm">"{selectedEntry.description}"</div>
                <div className="space-y-2">
                  {selectedEntry.updates?.map((u, i) => (
                    <div key={i} className="text-xs p-2 bg-white border rounded"><strong>{u.userName}:</strong> {u.text}</div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Añadir comentario..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                  <Button size="icon" className="bg-accent" onClick={handleAddComment}><Send className="w-4 h-4" /></Button>
                </div>
              </div>
              <DialogFooter className="p-6 bg-slate-50 border-t">
                {selectedEntry.status !== 'RESUELTO' && <Button onClick={() => handleStatusChange(selectedEntry.id, 'RESUELTO')} className="bg-green-600">Resolver</Button>}
                <Button variant="ghost" onClick={() => setSelectedEntryId(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* REMINDER MODAL */}
      <Dialog open={isReminderModalOpen} onOpenChange={setIsReminderModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Nuevo Recordatorio</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            let timerTarget = null;
            let durationMinutes = null;
            if (remFreq === 'TEMPORIZADOR') {
              const now = new Date();
              const h = parseInt(timerHours) || 0;
              const m = parseInt(timerMinutes) || 0;
              durationMinutes = (h * 60) + m;
              now.setMinutes(now.getMinutes() + durationMinutes);
              timerTarget = Timestamp.fromDate(now);
            }
            await addDoc(collection(db!, 'tenants', profile!.tenantId, 'reminders'), {
              title: formData.get('title'),
              description: formData.get('description'),
              frequency: remFreq,
              daysOfWeek: remFreq === 'SEMANAL' ? selectedDays : [],
              specificDate: remFreq === 'FECHA_ESPECIFICA' ? specificDate : null,
              timerTargetAt: timerTarget,
              timerDurationMinutes: durationMinutes,
              isActive: true,
              createdAt: serverTimestamp()
            });
            setIsReminderModalOpen(false);
            toast({ title: "Programado" });
          }} className="space-y-4 py-4">
            <div className="space-y-2"><Label>Asunto</Label><Input name="title" required placeholder="Ej: Revisar cloro" /></div>
            <div className="space-y-2"><Label>Frecuencia</Label>
              <Select value={remFreq} onValueChange={(v) => setRemFreq(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEMPORIZADOR">Temporizador (Cuenta Atrás)</SelectItem>
                  <SelectItem value="DIARIO">Diario</SelectItem>
                  <SelectItem value="SEMANAL">Semanal</SelectItem>
                  <SelectItem value="FECHA_ESPECIFICA">Fecha Calendario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {remFreq === 'TEMPORIZADOR' && (
              <div className="space-y-3 p-4 bg-rose-50 rounded-xl border border-rose-100">
                <Label className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-2">
                  <Timer className="w-3 h-3" /> Duración de la cuenta atrás
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase">Horas</Label>
                    <Input 
                      type="number" 
                      min="0"
                      value={timerHours}
                      onChange={(e) => setTimerHours(e.target.value)}
                      className="bg-white border-rose-200 text-lg font-black text-center h-12" 
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase">Minutos</Label>
                    <Input 
                      type="number" 
                      min="0"
                      max="59"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(e.target.value)}
                      className="bg-white border-rose-200 text-lg font-black text-center h-12" 
                    />
                  </div>
                </div>
                <p className="text-[9px] text-rose-500 italic">El temporizador aparecerá con cuenta atrás en el Dashboard.</p>
              </div>
            )}
            {remFreq === 'SEMANAL' && <div className="flex gap-2 justify-between">
              {DAYS_OF_WEEK.map(d => (
                <button key={d.value} type="button" onClick={() => setSelectedDays(prev => prev.includes(d.value) ? prev.filter(x => x !== d.value) : [...prev, d.value])} className={cn("w-8 h-8 rounded-full border text-[10px] font-bold", selectedDays.includes(d.value) ? "bg-primary text-white" : "bg-white")}>{d.label}</button>
              ))}
            </div>}
            {remFreq === 'FECHA_ESPECIFICA' && <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} required />}
            <DialogFooter><Button type="submit" className="bg-primary text-white font-bold px-8">Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
