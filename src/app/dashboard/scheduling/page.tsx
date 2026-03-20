
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO,
  isToday,
  isAfter,
  startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  Trash2,
  Loader2,
  ListFilter,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CalendarEvent } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = [
  { name: 'Azul Presto', value: 'bg-[#1F4AA8]', text: 'text-white' },
  { name: 'Acento', value: 'bg-[#28ACDA]', text: 'text-white' },
  { name: 'Emergencia', value: 'bg-[#ef4444]', text: 'text-white' },
  { name: 'Preventivo', value: 'bg-[#22c55e]', text: 'text-white' },
  { name: 'Aviso', value: 'bg-[#f59e0b]', text: 'text-white' },
  { name: 'Gris', value: 'bg-[#64748b]', text: 'text-white' },
];

export default function SchedulingPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const eventsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'scheduling'),
      orderBy('date', 'asc')
    );
  }, [db, profile?.tenantId]);

  const { data: events, isLoading: loading } = useCollection<CalendarEvent>(eventsQuery);

  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const dayEvents = (day: Date) => {
    if (!events) return [];
    return events.filter(event => event.date === format(day, 'yyyy-MM-dd'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleAddEvent = (day?: Date) => {
    setEditingEvent(null);
    setEventTitle('');
    setEventDate(format(day || selectedDate, 'yyyy-MM-dd'));
    setStartTime('09:00');
    setEndTime('10:00');
    setLocation('');
    setDescription('');
    setSelectedColor(COLORS[0].value);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDate(event.date);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setLocation(event.location || '');
    setDescription(event.description || '');
    setSelectedColor(event.color);
    setIsModalOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !eventTitle.trim()) return;

    const eventData = {
      title: eventTitle,
      date: eventDate,
      startTime,
      endTime,
      location,
      description,
      color: selectedColor,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingEvent) {
        const eventRef = doc(db, 'tenants', profile.tenantId, 'scheduling', editingEvent.id);
        await updateDoc(eventRef, eventData);
        toast({ title: "Evento actualizado" });
      } else {
        const colRef = collection(db, 'tenants', profile.tenantId, 'scheduling');
        await addDoc(colRef, {
          ...eventData,
          createdBy: profile.displayName || user?.email || 'Técnico',
          createdAt: serverTimestamp(),
        });
        toast({ title: "Evento programado" });
      }
      setIsModalOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db || !profile?.tenantId) return;
    if (!confirm('¿Seguro que deseas eliminar esta programación?')) return;
    
    try {
      const eventRef = doc(db, 'tenants', profile.tenantId, 'scheduling', id);
      await deleteDoc(eventRef);
      toast({ title: "Evento eliminado" });
      setIsModalOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al eliminar" });
    }
  };

  const filteredUpcomingEvents = useMemo(() => {
    if (!events) return [];
    // Mostrar eventos del mes actual o futuros
    return events.filter(e => {
      const eventDate = parseISO(e.date);
      return isSameMonth(eventDate, currentMonth) || isAfter(eventDate, startOfToday());
    }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [events, currentMonth]);

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* Calendario Card */}
        <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl relative shrink-0">
          {/* Navigation Bar */}
          <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white/50 backdrop-blur-md">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <CalendarIcon size={20} />
                </div>
                <h1 className="text-xl font-black text-primary tracking-tight uppercase">Programación</h1>
              </div>
              
              <div className="flex items-center gap-4 ml-8">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="font-bold h-9 rounded-full px-6"
                >
                  Hoy
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-full">
                    <ChevronLeft size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-full">
                    <ChevronRight size={18} />
                  </Button>
                </div>
                <h2 className="text-xl font-black text-slate-900 capitalize tracking-tight min-w-[180px]">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
              </div>
            </div>

            <Button className="gap-2 bg-accent shadow-lg h-11 px-6 rounded-full font-bold" onClick={() => handleAddEvent()}>
              <Plus size={18} /> Crear Evento
            </Button>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Day Headers */}
              <div className="grid grid-cols-7 px-4 py-3 bg-slate-50/50 border-b">
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(day => (
                  <div key={day} className="text-center text-[10px] font-black text-slate-400 tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Grid */}
              <div className="grid grid-cols-7 gap-px p-px flex-1 bg-slate-100 overflow-hidden">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isSelected = isSameDay(day, selectedDate);
                  const eventsForDay = dayEvents(day);
                  const today = isToday(day);

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day);
                        handleAddEvent(day);
                      }}
                      className={cn(
                        "bg-white p-2 min-h-0 transition-all cursor-pointer flex flex-col group relative",
                        !isCurrentMonth && "bg-slate-50/50 opacity-40",
                        isSelected && "bg-blue-50/30",
                        today && "bg-white"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-xs w-7 h-7 flex items-center justify-center rounded-lg transition-all font-black",
                          today ? "bg-primary text-white shadow-md" : "text-slate-400 group-hover:bg-slate-100",
                          isSelected && !today && "text-primary bg-slate-100"
                        )}>
                          {format(day, 'd')}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={14} className="text-slate-300" />
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-1 overflow-hidden pr-1">
                        {eventsForDay.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                            className={cn(
                              "px-2 py-1 text-[9px] rounded-md truncate font-bold transition-all hover:brightness-90 shadow-sm flex items-center gap-1.5",
                              event.color,
                              COLORS.find(c => c.value === event.color)?.text || 'text-white'
                            )}
                          >
                            <span className="opacity-70 text-[8px]">{event.startTime}</span>
                            <span className="flex-1 truncate uppercase">{event.title}</span>
                          </div>
                        ))}
                        {eventsForDay.length > 3 && (
                          <div className="text-[8px] font-black text-muted-foreground text-center pt-1">
                            + {eventsForDay.length - 3} MÁS
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          </div>
        </div>

        {/* Agenda Vista de Filas */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <ListFilter size={20} />
            </div>
            <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Agenda Detallada</h3>
          </div>

          <Card className="border-none shadow-lg ring-1 ring-slate-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                    <p className="mt-4 font-bold text-muted-foreground uppercase text-xs">Cargando listado...</p>
                  </div>
                ) : filteredUpcomingEvents.length === 0 ? (
                  <div className="p-20 text-center bg-slate-50/50">
                    <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="font-bold text-slate-500 italic">No hay eventos programados para este periodo.</p>
                    <Button variant="link" onClick={() => handleAddEvent()} className="mt-2 text-accent">Programar primera actuación</Button>
                  </div>
                ) : (
                  filteredUpcomingEvents.map((event) => {
                    const date = parseISO(event.date);
                    return (
                      <div 
                        key={event.id} 
                        className="flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-slate-50 transition-all group cursor-pointer"
                        onClick={() => handleEditEvent(event)}
                      >
                        {/* Indicador de Fecha */}
                        <div className="flex gap-4 items-center shrink-0 w-48">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200 group-hover:bg-white transition-colors">
                            <span className="text-[10px] font-black text-primary uppercase leading-none">{format(date, 'MMM', { locale: es })}</span>
                            <span className="text-2xl font-black text-slate-900 leading-tight">{format(date, 'dd')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{format(date, 'EEEE', { locale: es })}</span>
                            <span className="text-xs font-bold text-slate-400">{format(date, 'yyyy')}</span>
                          </div>
                        </div>

                        {/* Detalles del Evento */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <div className={cn("w-3 h-3 rounded-full shadow-sm", event.color)} />
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors truncate">
                              {event.title}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                              <Clock className="w-3.5 h-3.5 text-accent" /> {event.startTime} - {event.endTime}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                                <MapPin className="w-3.5 h-3.5 text-accent" /> {event.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Descripción / Notas */}
                        <div className="hidden lg:block flex-1 max-w-md">
                          <p className="text-xs text-muted-foreground line-clamp-2 italic font-medium leading-relaxed">
                            {event.description || 'Sin notas técnicas adicionales.'}
                          </p>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase gap-2 hover:bg-white group-hover:translate-x-1 transition-all">
                            Ver Detalle <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-slate-200">
                <CalendarIcon size={20} />
              </div>
              <DialogTitle className="text-xl font-black text-primary uppercase tracking-tight">
                {editingEvent ? 'Editar Programación' : 'Añadir al Calendario'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={saveEvent} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Título de la Actuación</Label>
                <Input 
                  autoFocus
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ej: Visita OCA, Revisión Ascensores..."
                  className="h-12 text-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fecha</Label>
                  <Input 
                    type="date" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-11 font-bold"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inicio</Label>
                    <Input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-11 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fin</Label>
                    <Input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-11 font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ubicación / Área</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Sala de máquinas, Planta 2..."
                    className="pl-10 h-11 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Notas Técnicas</Label>
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles adicionales, proveedor, persona de contacto..."
                  rows={3}
                  className="font-bold resize-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Etiqueta Visual</Label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        color.value,
                        selectedColor === color.value ? "border-primary ring-2 ring-offset-2 ring-primary scale-110" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t">
              {editingEvent && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="text-red-500 hover:bg-red-50 font-black h-12 px-6"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold h-12">Cancelar</Button>
              <Button type="submit" className="bg-primary px-10 font-black h-12 shadow-lg">
                {editingEvent ? 'ACTUALIZAR' : 'PROGRAMAR EVENTO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
