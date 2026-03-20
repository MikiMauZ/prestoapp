
"use client"

import React, { useState, useMemo } from 'react';
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
  Bell, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Trash2, 
  Clock, 
  CheckCircle2,
  XCircle,
  Pencil,
  AlertCircle,
  Filter,
  MoreVertical,
  CheckSquare,
  Square,
  Repeat,
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
import { collection, query, orderBy, doc, serverTimestamp, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { Reminder, ReminderFrequency } from '@/lib/types';

const DAYS_OF_WEEK = [
  { label: 'Lunes', value: 1, short: 'L' },
  { label: 'Martes', value: 2, short: 'M' },
  { label: 'Miércoles', value: 3, short: 'X' },
  { label: 'Jueves', value: 4, short: 'J' },
  { label: 'Viernes', value: 5, short: 'V' },
  { label: 'Sábado', value: 6, short: 'S' },
  { label: 'Domingo', value: 0, short: 'D' },
];

export default function RemindersManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  
  // Form states
  const [remFreq, setRemFreq] = useState<ReminderFrequency>('DIARIO');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<string>('');
  const [timerHours, setTimerHours] = useState<string>('1');
  const [timerMinutes, setTimerMinutes] = useState<string>('0');

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const remindersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'reminders'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const { data: reminders, isLoading: loading } = useCollection<Reminder>(remindersQuery);

  const filteredReminders = useMemo(() => {
    if (!reminders) return [];
    return reminders.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reminders, searchTerm]);

  const handleOpenCreate = () => {
    setEditingReminder(null);
    setRemFreq('DIARIO');
    setSelectedDays([]);
    setSpecificDate('');
    setTimerHours('1');
    setTimerMinutes('0');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setRemFreq(reminder.frequency);
    setSelectedDays(reminder.daysOfWeek || []);
    setSpecificDate(reminder.specificDate || '');
    if (reminder.timerDurationMinutes) {
      setTimerHours(Math.floor(reminder.timerDurationMinutes / 60).toString());
      setTimerMinutes((reminder.timerDurationMinutes % 60).toString());
    }
    setIsDialogOpen(true);
  };

  const toggleDay = (dayVal: number) => {
    setSelectedDays(prev => 
      prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
    );
  };

  const handleSaveReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId) return;

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

    const reminderData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      frequency: remFreq,
      daysOfWeek: remFreq === 'SEMANAL' ? selectedDays : [],
      specificDate: remFreq === 'FECHA_ESPECIFICA' ? specificDate : null,
      timerTargetAt: timerTarget,
      timerDurationMinutes: durationMinutes,
      isActive: true,
      updatedAt: serverTimestamp(),
    };

    if (editingReminder) {
      const ref = doc(db, 'tenants', profile.tenantId, 'reminders', editingReminder.id);
      updateDocumentNonBlocking(ref, reminderData);
      toast({ title: "Recordatorio actualizado" });
    } else {
      const colRef = collection(db, 'tenants', profile.tenantId, 'reminders');
      addDocumentNonBlocking(colRef, {
        ...reminderData,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Recordatorio creado" });
    }

    setIsDialogOpen(false);
  };

  const toggleActive = (reminder: Reminder) => {
    if (!db || !profile?.tenantId) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'reminders', reminder.id);
    updateDoc(ref, { isActive: !reminder.isActive });
    toast({ 
      title: reminder.isActive ? "Desactivado" : "Activado",
      description: `El recordatorio "${reminder.title}" ha sido actualizado.`
    });
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !reminderToDelete) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'reminders', reminderToDelete);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Recordatorio eliminado" });
    setReminderToDelete(null);
  };

  const getFreqBadge = (reminder: Reminder) => {
    switch (reminder.frequency) {
      case 'DIARIO': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">DIARIO</Badge>;
      case 'SEMANAL': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">SEMANAL ({reminder.daysOfWeek?.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.short).join('')})</Badge>;
      case 'MENSUAL': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100">MENSUAL</Badge>;
      case 'FECHA_ESPECIFICA': return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-100">FECHA: {reminder.specificDate}</Badge>;
      case 'PUNTUAL': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-100">PUNTUAL</Badge>;
      case 'TEMPORIZADOR': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100">TEMPORIZADOR</Badge>;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
              <Bell className="w-8 h-8 text-accent" />
              Gestión de Recordatorios
            </h2>
            <p className="text-muted-foreground font-medium">Configura tareas preventivas, rutinas técnicas y temporizadores.</p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg font-bold text-white" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" /> Nuevo Recordatorio
          </Button>
        </div>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="bg-white border-b py-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por título o descripción..." 
                className="pl-10 h-10 border-slate-200 bg-slate-50/50" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground italic">Cargando programación...</div>
              ) : filteredReminders.length === 0 ? (
                <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-4">
                  <AlertCircle className="w-12 h-12 text-slate-200" />
                  <p className="font-bold">No hay recordatorios configurados.</p>
                  <Button variant="outline" size="sm" onClick={handleOpenCreate}>Crear el primero ahora</Button>
                </div>
              ) : filteredReminders.map((rem) => (
                <div key={rem.id} className={cn(
                  "p-4 flex items-center justify-between hover:bg-slate-50 transition-colors",
                  !rem.isActive && rem.frequency !== 'TEMPORIZADOR' && "opacity-60 bg-slate-50/30"
                )}>
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      rem.isActive ? "bg-accent/10 text-accent" : "bg-slate-200 text-sidebar-foreground/30"
                    )}>
                      {rem.frequency === 'TEMPORIZADOR' ? <Timer className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 truncate">{rem.title}</h4>
                        {getFreqBadge(rem)}
                        {!rem.isActive && <Badge variant="secondary" className="text-[8px] font-black uppercase">INACTIVO</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        {rem.description || 'Sin notas adicionales.'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          {rem.frequency === 'TEMPORIZADOR' 
                            ? `Expiración: ${rem.timerTargetAt?.toDate ? rem.timerTargetAt.toDate().toLocaleString() : 'Pendiente'}`
                            : `Últ. vez: ${rem.lastCompletedAt?.toDate ? rem.lastCompletedAt.toDate().toLocaleDateString() : 'Nunca'}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {rem.frequency !== 'TEMPORIZADOR' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("text-[10px] font-black uppercase tracking-tighter h-8", rem.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700")}
                        onClick={() => toggleActive(rem)}
                      >
                        {rem.isActive ? 'Pausar' : 'Activar'}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleOpenEdit(rem)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setReminderToDelete(rem.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</DialogTitle>
            <DialogDescription>Configura una tarea habitual o una cita específica en el calendario.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveReminder} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>¿Qué hay que recordar?</Label>
              <Input name="title" required defaultValue={editingReminder?.title} placeholder="Ej: Revisar cloro depósitos" />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Aviso</Label>
              <Select value={remFreq} onValueChange={(v) => setRemFreq(v as ReminderFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEMPORIZADOR">Temporizador (Cuenta Atrás)</SelectItem>
                  <SelectItem value="DIARIO">Todos los días (DIARIO)</SelectItem>
                  <SelectItem value="SEMANAL">Días específicos de la semana</SelectItem>
                  <SelectItem value="MENSUAL">Una vez al mes</SelectItem>
                  <SelectItem value="FECHA_ESPECIFICA">Fecha concreta (Calendario)</SelectItem>
                  <SelectItem value="PUNTUAL">Solo esta vez (Sin repetir)</SelectItem>
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
                      required
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
                      required
                    />
                  </div>
                </div>
                <p className="text-[9px] text-rose-500 italic">El temporizador aparecerá con cuenta atrás en el Dashboard.</p>
              </div>
            )}

            {remFreq === 'SEMANAL' && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-dashed">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Repetir los días:</Label>
                <div className="flex justify-between">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 text-[10px] font-black transition-all",
                          selectedDays.includes(day.value) 
                            ? "bg-primary border-primary text-white shadow-md" 
                            : "bg-white border-slate-200 text-sidebar-foreground/30 hover:border-primary"
                        )}
                      >
                        {day.short}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {remFreq === 'FECHA_ESPECIFICA' && (
              <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Label className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Elegir fecha en el calendario
                </Label>
                <Input 
                  type="date" 
                  value={specificDate} 
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="bg-white border-blue-200" 
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Input name="description" defaultValue={editingReminder?.description} placeholder="Opcional..." />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-white font-bold px-8">
                {editingReminder ? 'Guardar Cambios' : 'Activar Recordatorio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!reminderToDelete} onOpenChange={(open) => !open && setReminderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              ¿Confirmar eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borrará definitivamente el recordatorio y su historial de cumplimiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold">
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
