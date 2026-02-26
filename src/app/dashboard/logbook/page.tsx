
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
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  ArrowRight,
  BarChart3,
  X,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Send,
  CalendarDays
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { LogbookEntry, LogbookStatus, ShiftType } from '@/lib/types';

export default function LogbookPage() {
  const [activeTab, setActiveTab] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const logbookQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'logbook'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const { data: logbookEntries, isLoading: loading } = useCollection<LogbookEntry>(logbookQuery);

  const selectedEntry = useMemo(() => {
    return logbookEntries?.find(e => e.id === selectedEntryId);
  }, [logbookEntries, selectedEntryId]);

  const filteredEntries = useMemo(() => {
    if (!logbookEntries) return [];
    return logbookEntries.filter(entry => {
      const matchesSearch = (entry.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                           (entry.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      let matchesTab = false;
      if (activeTab === 'open') {
        matchesTab = entry.status !== 'RESUELTO' && entry.status !== 'CERRADO';
      } else if (activeTab === 'all') {
        matchesTab = true;
      } else if (activeTab === 'incidents') {
        matchesTab = entry.type === 'INCIDENCIA';
      } else if (activeTab === 'tasks') {
        matchesTab = entry.type === 'TAREA';
      } else if (activeTab === 'shifts') {
        matchesTab = entry.type === 'CAMBIO_TURNO';
      }
      
      return matchesSearch && matchesTab;
    });
  }, [logbookEntries, searchTerm, activeTab]);

  const stats = useMemo(() => {
    if (!logbookEntries) return { critical: 0, open: 0, resolved: 0 };
    return {
      critical: logbookEntries.filter(e => e.priority === 'CRITICA' && e.status !== 'CERRADO').length,
      open: logbookEntries.filter(e => e.status !== 'RESUELTO' && e.status !== 'CERRADO').length,
      resolved: logbookEntries.filter(e => e.status === 'RESUELTO' || e.status === 'CERRADO').length,
    };
  }, [logbookEntries]);

  const handleCreateEntry = (e: React.FormEvent<HTMLFormElement>) => {
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
      createdBy: profile.displayName || user.email,
      createdById: user.uid,
      createdAt: serverTimestamp(),
      updates: []
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'logbook');
    addDocumentNonBlocking(colRef, newEntry);

    toast({
      title: "Entrada registrada",
      description: "La nueva actividad ha sido añadida al logbook.",
    });
    setIsDialogOpen(false);
  };

  const handleStatusChange = (entryId: string, newStatus: LogbookStatus) => {
    if (!db || !profile?.tenantId || !user || !profile) return;
    const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', entryId);
    
    const updateData: any = { 
      status: newStatus,
      updates: arrayUnion({
        text: `Estado cambiado a ${newStatus}`,
        userName: profile.displayName || user.email || 'Técnico',
        userId: user.uid,
        timestamp: new Date(),
        statusAtTime: newStatus
      })
    };

    if (newStatus === 'RESUELTO') {
      updateData.resolvedAt = serverTimestamp();
    }
    
    updateDocumentNonBlocking(entryRef, updateData);
    toast({
      title: "Estado actualizado",
      description: `La entrada ahora está en estado: ${newStatus}`,
    });
  };

  const handleAddComment = () => {
    if (!db || !profile?.tenantId || !user || !profile || !selectedEntryId || !commentText.trim()) return;
    
    const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', selectedEntryId);
    
    updateDocumentNonBlocking(entryRef, {
      updates: arrayUnion({
        text: commentText,
        userName: profile.displayName || user.email || 'Técnico',
        userId: user.uid,
        timestamp: new Date(),
        statusAtTime: selectedEntry?.status || 'ABIERTO'
      })
    });

    setCommentText('');
    toast({
      title: "Comentario añadido",
      description: "Se ha registrado tu actualización con firma digital.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Logbook Operativo</h2>
            <p className="text-muted-foreground font-medium">Gestión interna de incidencias y cambios de turno.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
                <Plus className="w-4 h-4" />
                Nueva Entrada
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nueva Entrada Logbook</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEntry} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Registro</Label>
                    <Select name="type" defaultValue="INCIDENCIA">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCIDENCIA">Incidencia</SelectItem>
                        <SelectItem value="TAREA">Tarea</SelectItem>
                        <SelectItem value="CAMBIO_TURNO">Cambio Turno / Relevo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift">Turno Actual</Label>
                    <Select name="shift" defaultValue="MAÑANA">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAÑANA">Mañana</SelectItem>
                        <SelectItem value="TARDE">Tarde</SelectItem>
                        <SelectItem value="NOCHE">Noche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select name="priority" defaultValue="MEDIA">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJA">Baja</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="CRITICA">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Área Relacionada</Label>
                    <Input id="area" name="area" placeholder="Ej: Sala de máquinas" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título / Asunto</Label>
                  <Input id="title" name="title" required placeholder="Ej: Fuga en bomba pool 1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción Detallada</Label>
                  <Textarea id="description" name="description" required rows={4} placeholder="Describe el estado o la incidencia..." />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary">Guardar Registro</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Críticas</p>
                  <p className="text-2xl font-black text-red-900">{stats.critical}</p>
                </div>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Pendientes</p>
                  <p className="text-2xl font-black text-blue-900">{stats.open}</p>
                </div>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Resueltas</p>
                  <p className="text-2xl font-black text-green-900">{stats.resolved}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Estado</p>
                  <p className="text-2xl font-black text-slate-900">Activo</p>
                </div>
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="open" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <TabsList className="bg-white border">
              <TabsTrigger value="open">Abiertas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="incidents">Incidencias</TabsTrigger>
              <TabsTrigger value="tasks">Tareas</TabsTrigger>
              <TabsTrigger value="shifts">Turnos</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 h-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[100px]">Estado</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Cargando entradas...</TableCell></TableRow>
                  ) : filteredEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">No hay registros disponibles para este filtro.</TableCell></TableRow>
                  ) : filteredEntries.map((entry) => (
                    <TableRow 
                      key={entry.id} 
                      className="group cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      <TableCell>
                        {entry.status === 'ABIERTO' && <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">ABIERTO</Badge>}
                        {entry.status === 'EN_PROGRESO' && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">CURSO</Badge>}
                        {entry.status === 'PAUSADO' && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">PAUSA</Badge>}
                        {entry.status === 'RESUELTO' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">RESUELTO</Badge>}
                        {entry.status === 'CERRADO' && <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50">CERRADO</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{entry.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{entry.type?.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="ghost" className="text-[10px] font-bold uppercase">{entry.shift || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.priority === 'CRITICA' && <Badge className="bg-red-600">CRÍTICA</Badge>}
                        {entry.priority === 'ALTA' && <Badge className="bg-orange-500">ALTA</Badge>}
                        {entry.priority === 'MEDIA' && <Badge className="bg-blue-500">MEDIA</Badge>}
                        {entry.priority === 'BAJA' && <Badge className="bg-slate-400">BAJA</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">{entry.relatedArea || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-semibold">{entry.createdBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntryId} onOpenChange={() => setSelectedEntryId(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedEntry && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn(
                        selectedEntry.priority === 'CRITICA' ? "bg-red-600" : "bg-primary"
                      )}>{selectedEntry.priority}</Badge>
                      <Badge variant="secondary" className="font-bold">{selectedEntry.shift}</Badge>
                    </div>
                    <DialogTitle className="text-2xl font-bold">{selectedEntry.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-black">{selectedEntry.type}</p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Estado Actual</p>
                    <Badge variant="outline" className="font-bold border-accent text-accent">{selectedEntry.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Ubicación / Área</p>
                    <p className="text-sm font-semibold">{selectedEntry.relatedArea || 'No especificada'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Técnico Apertura</p>
                    <p className="text-sm font-semibold">{selectedEntry.createdBy}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Fecha Registro</p>
                    <p className="text-xs font-bold">{selectedEntry.createdAt?.toDate ? selectedEntry.createdAt.toDate().toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Descripción del Problema / Nota</p>
                  <p className="text-sm leading-relaxed p-4 bg-muted/30 rounded-lg italic border-l-4 border-accent/30">"{selectedEntry.description}"</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Historial de Actualizaciones y Comentarios
                    </p>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {selectedEntry.updates && selectedEntry.updates.length > 0 ? (
                      selectedEntry.updates.map((update, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 bg-slate-50 p-3 rounded-2xl rounded-tl-none border">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black text-primary uppercase">{update.userName}</span>
                              <span className="text-[9px] text-muted-foreground">
                                {update.timestamp?.toDate ? update.timestamp.toDate().toLocaleString() : new Date(update.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-normal">{update.text}</p>
                            <Badge variant="ghost" className="mt-2 text-[8px] h-4 bg-white/50 border p-1 px-2 font-bold tracking-tighter">
                              {update.statusAtTime}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-4 bg-slate-50/50 rounded-lg border border-dashed">No hay actualizaciones registradas aún.</p>
                    )}
                  </div>

                  <div className="pt-4 border-t flex gap-2">
                    <Textarea 
                      placeholder="Añadir comentario o actualización de trabajo..." 
                      className="min-h-[60px] text-xs"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <Button 
                      size="icon" 
                      className="bg-accent h-auto shrink-0" 
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t flex flex-wrap gap-2 items-center justify-between bg-slate-50/50 mt-auto">
                 <div className="flex flex-wrap gap-2">
                  {selectedEntry.status !== 'RESUELTO' && selectedEntry.status !== 'CERRADO' && (
                    <>
                      {selectedEntry.status === 'ABIERTO' || selectedEntry.status === 'PAUSADO' ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 border-blue-200 text-blue-700 bg-white hover:bg-blue-50"
                          onClick={() => handleStatusChange(selectedEntry.id, 'EN_PROGRESO')}
                        >
                          <PlayCircle className="w-4 h-4" /> Continuar
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 border-orange-200 text-orange-700 bg-white hover:bg-orange-50"
                          onClick={() => handleStatusChange(selectedEntry.id, 'PAUSADO')}
                        >
                          <PauseCircle className="w-4 h-4" /> Pausar
                        </Button>
                      )}
                      
                      <Button 
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 font-bold"
                        onClick={() => handleStatusChange(selectedEntry.id, 'RESUELTO')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Resuelto
                      </Button>
                    </>
                  )}
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => setSelectedEntryId(null)}>Cerrar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
