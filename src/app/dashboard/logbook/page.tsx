
"use client"

import React, { useState, useMemo, useRef } from 'react';
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
  CalendarDays,
  Camera,
  Loader2,
  Image as ImageIcon,
  Pencil,
  Trash2
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
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { LogbookEntry, LogbookStatus, ShiftType } from '@/lib/types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';

export default function LogbookPage() {
  const [activeTab, setActiveTab] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const [commentPhotos, setCommentPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'entry' | 'comment') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      if (type === 'entry') {
        setEntryPhotos(prev => [...prev, ...urls]);
      } else {
        setCommentPhotos(prev => [...prev, ...urls]);
      }
      toast({ title: "Fotos añadidas" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron subir las imágenes." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setEntryPhotos([]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setEntryPhotos(entry.attachments || []);
    setIsDialogOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const entryData = {
      type: formData.get('type'),
      priority: formData.get('priority'),
      title: formData.get('title'),
      description: formData.get('description'),
      relatedArea: formData.get('area'),
      attachments: entryPhotos,
      updatedAt: serverTimestamp(),
    };

    if (editingEntry) {
      const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', editingEntry.id);
      updateDocumentNonBlocking(entryRef, entryData);
      toast({ title: "Registro actualizado" });
    } else {
      const newEntry = {
        ...entryData,
        status: 'ABIERTO',
        createdBy: profile.displayName || user.email,
        createdById: user.uid,
        createdAt: serverTimestamp(),
        updates: []
      };
      const colRef = collection(db, 'tenants', profile.tenantId, 'logbook');
      addDocumentNonBlocking(colRef, newEntry);
      toast({ title: "Entrada registrada" });
    }

    setEntryPhotos([]);
    setIsDialogOpen(false);
    setEditingEntry(null);
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
    if (!db || !profile?.tenantId || !user || !profile || !selectedEntryId || (!commentText.trim() && commentPhotos.length === 0)) return;
    
    const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', selectedEntryId);
    
    updateDocumentNonBlocking(entryRef, {
      updates: arrayUnion({
        text: commentText,
        userName: profile.displayName || user.email || 'Técnico',
        userId: user.uid,
        timestamp: new Date(),
        statusAtTime: selectedEntry?.status || 'ABIERTO',
        attachments: commentPhotos
      })
    });

    setCommentText('');
    setCommentPhotos([]);
    toast({ title: "Comentario añadido" });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!db || !profile?.tenantId) return;
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    
    const entryRef = doc(db, 'tenants', profile.tenantId, 'logbook', entryId);
    deleteDocumentNonBlocking(entryRef);
    toast({ title: "Registro eliminado" });
    setSelectedEntryId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Logbook Operativo</h2>
            <p className="text-muted-foreground font-medium">Gestión integral de incidencias y tareas técnicas.</p>
          </div>
          <Button className="gap-2 bg-accent hover:bg-accent/90 shadow-lg" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Nueva Entrada
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-red-600 uppercase">Críticas</p><p className="text-2xl font-black text-red-900">{stats.critical}</p></div>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-blue-600 uppercase">Pendientes</p><p className="text-2xl font-black text-blue-900">{stats.open}</p></div>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-green-600 uppercase">Resueltas</p><p className="text-2xl font-black text-green-900">{stats.resolved}</p></div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-slate-600 uppercase">Historial</p><p className="text-2xl font-black">MULTI</p></div>
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
            </TabsList>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Estado</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                  ) : filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="group cursor-pointer hover:bg-muted/30" onClick={() => setSelectedEntryId(entry.id)}>
                      <TableCell><Badge variant="outline" className={cn(entry.status === 'ABIERTO' ? "text-red-600 border-red-200" : "text-green-600 border-green-200")}>{entry.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{entry.title}</span>
                          {(entry.attachments?.length || 0) > 0 && <ImageIcon className="w-3 h-3 text-accent" />}
                        </div>
                      </TableCell>
                      <TableCell><Badge className={cn(entry.priority === 'CRITICA' ? "bg-red-600" : "bg-blue-500")}>{entry.priority}</Badge></TableCell>
                      <TableCell className="text-xs font-semibold">{entry.createdBy}</TableCell>
                      <TableCell className="text-right"><ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* DIALOGO CREAR / EDITAR */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEntryPhotos([]);
          setEditingEntry(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Editar Entrada' : 'Nueva Entrada Logbook'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEntry} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={editingEntry?.type || "INCIDENCIA"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCIDENCIA">Incidencia</SelectItem>
                    <SelectItem value="TAREA">Tarea</SelectItem>
                    <SelectItem value="CAMBIO_TURNO">Cambio Turno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select name="priority" defaultValue={editingEntry?.priority || "MEDIA"}>
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
              <Label htmlFor="area">Ubicación / Área</Label>
              <Input name="area" defaultValue={editingEntry?.relatedArea} placeholder="Ej: Habitación 201, Cocina..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título / Asunto</Label>
              <Input id="title" name="title" required defaultValue={editingEntry?.title} placeholder="Ej: Fuga en bomba pool 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" required defaultValue={editingEntry?.description} rows={4} placeholder="Describe el estado o la incidencia..." />
            </div>

            <div className="space-y-2">
              <Label>Fotos / Evidencias</Label>
              <div className="flex flex-wrap gap-2">
                {entryPhotos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border group">
                    <Image src={url} alt={`Adjunto ${i}`} fill className="object-cover" />
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
                  className={cn(
                    "w-16 h-16 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent transition-colors",
                    isUploading && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span className="text-[8px] font-bold uppercase">Añadir</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'entry')} />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary" disabled={isUploading}>
                {editingEntry ? 'Guardar Cambios' : 'Guardar Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETALLE DE ENTRADA */}
      <Dialog open={!!selectedEntryId} onOpenChange={() => setSelectedEntryId(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          {selectedEntry && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className={cn(selectedEntry.priority === 'CRITICA' ? "bg-red-600" : "bg-primary")}>{selectedEntry.priority}</Badge>
                    <DialogTitle className="text-2xl font-bold mt-2">{selectedEntry.title}</DialogTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { handleOpenEdit(selectedEntry); setSelectedEntryId(null); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteEntry(selectedEntry.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Evidencias Fotográficas</p>
                    <div className="flex flex-wrap gap-3">
                      {selectedEntry.attachments.map((url, i) => (
                        <div key={i} className="relative w-32 h-32 rounded-xl overflow-hidden border-2 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(url, '_blank')}>
                          <Image src={url} alt={`Evidencia ${i}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Descripción</p>
                  <p className="text-sm leading-relaxed p-4 bg-muted/30 rounded-lg italic">"{selectedEntry.description}"</p>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Historial y Comentarios</p>
                  <div className="space-y-3">
                    {selectedEntry.updates?.map((update, idx) => (
                      <div key={idx} className="flex flex-col gap-2 text-xs bg-slate-50 p-3 rounded-xl border">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-primary uppercase">{update.userName}:</span>
                          <span className="text-[10px] text-muted-foreground">{(update.timestamp as any)?.toDate?.().toLocaleString() || 'Reciente'}</span>
                        </div>
                        <div className="flex-1">{update.text}</div>
                        {update.attachments && update.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {update.attachments.map((url, i) => (
                              <div key={i} className="relative w-12 h-12 rounded border overflow-hidden cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                <Image src={url} alt="" fill className="object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex flex-wrap gap-2">
                      {commentPhotos.map((url, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden border group">
                          <Image src={url} alt="" fill className="object-cover" />
                          <button type="button" onClick={() => setCommentPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"><X className="w-2 h-2" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => commentFileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </Button>
                      <input type="file" ref={commentFileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'comment')} />
                      <Textarea placeholder="Añadir comentario..." className="min-h-[60px] text-xs" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                      <Button size="icon" className="bg-accent h-auto shrink-0" onClick={handleAddComment} disabled={!commentText.trim() && commentPhotos.length === 0}><Send className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t flex justify-end gap-2 bg-slate-50/50">
                {selectedEntry.status !== 'RESUELTO' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(selectedEntry.id, 'RESUELTO')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Resolver
                  </Button>
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
