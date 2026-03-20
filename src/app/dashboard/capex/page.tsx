
"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  HardHat, 
  Plus, 
  Search, 
  Euro, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  FileText,
  Trash2,
  Pencil,
  ChevronRight,
  TrendingUp,
  Camera,
  Loader2,
  X,
  Building2,
  MoreVertical,
  Activity,
  Snowflake,
  Filter,
  Download
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { CapexProject, CapexCategory, CapexStatus, Priority, CapexProjectType } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const CATEGORIES: { value: CapexCategory; label: string; color: string }[] = [
  { value: 'REFORMA', label: 'Refórmas / Obras', color: 'bg-blue-100 text-blue-700' },
  { value: 'MAQUINARIA', label: 'Maquinaria / Activos', color: 'bg-orange-100 text-orange-700' },
  { value: 'ENERGIA', label: 'Eficiencia Energética', color: 'bg-green-100 text-green-700' },
  { value: 'MOBILIARIO', label: 'Mobiliario FF&E', color: 'bg-purple-100 text-purple-700' },
  { value: 'OTRO', label: 'Otras Inversiones', color: 'bg-slate-100 text-slate-700' },
];

export default function CapexPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<CapexProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Bloque de seguridad para evitar que la pantalla se quede congelada tras eliminar
  useEffect(() => {
    const cleanup = () => {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    };
    if (!projectToDeleteId && !selectedProjectId && !isDialogOpen) {
      cleanup();
    }
    return cleanup;
  }, [projectToDeleteId, selectedProjectId, isDialogOpen]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const capexQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'capex'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const { data: projects, isLoading: loading } = useCollection<CapexProject>(capexQuery);

  const selectedProject = useMemo(() => projects?.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = activeTypeTab === 'all' || p.projectType === activeTypeTab;
      return matchesSearch && matchesType;
    });
  }, [projects, searchTerm, activeTypeTab]);

  const stats = useMemo(() => {
    if (!projects) return { total: 0, budget: 0, actual: 0, capexCount: 0, winterCount: 0 };
    return {
      total: projects.length,
      budget: projects.reduce((acc, p) => acc + (p.estimatedBudget || 0), 0),
      actual: projects.reduce((acc, p) => acc + (p.actualCost || 0), 0),
      capexCount: projects.filter(p => p.projectType === 'CAPEX').length,
      winterCount: projects.filter(p => p.projectType === 'MEJORA_INVIERNO').length
    };
  }, [projects]);

  const exportToExcel = () => {
    if (!filteredProjects.length) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay proyectos para exportar." });
      return;
    }

    const headers = ["Tipo", "Título", "Categoría", "Estado", "Prioridad", "Presupuesto (€)", "Coste Real (€)", "Fecha Inicio", "Fecha Fin", "Registrado Por", "Notas"];
    const rows = filteredProjects.map(p => [
      p.projectType,
      p.title,
      p.category,
      p.status,
      p.priority,
      p.estimatedBudget || 0,
      p.actualCost || 0,
      p.startDate || '',
      p.endDate || '',
      p.createdBy,
      (p.notes || '').replace(/,/g, ';')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mejoras_tecnicas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Excel generado", description: "Descarga completada correctamente." });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...urls]);
      toast({ title: "Archivos listos" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de carga" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const projectData = {
      projectType: formData.get('projectType') as CapexProjectType,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as CapexCategory,
      status: formData.get('status') as CapexStatus,
      priority: formData.get('priority') as Priority,
      estimatedBudget: parseFloat(formData.get('estimatedBudget') as string) || 0,
      actualCost: parseFloat(formData.get('actualCost') as string) || 0,
      startDate: formData.get('startDate') as string || null,
      endDate: formData.get('endDate') as string || null,
      notes: formData.get('notes') as string,
      attachments: attachments,
      updatedAt: serverTimestamp(),
    };

    if (editingProject) {
      const projRef = doc(db, 'tenants', profile.tenantId, 'capex', editingProject.id);
      updateDocumentNonBlocking(projRef, projectData);
      toast({ title: "Proyecto actualizado" });
    } else {
      const newProject = {
        ...projectData,
        createdBy: profile.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      const colRef = collection(db, 'tenants', profile.tenantId, 'capex');
      addDocumentNonBlocking(colRef, newProject);
      toast({ title: "Proyecto registrado" });
    }

    setIsDialogOpen(false);
    setAttachments([]);
    setEditingProject(null);
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !projectToDeleteId) return;
    
    // Primero cerramos los estados para evitar que Radix intente recuperar foco
    const idToDelete = projectToDeleteId;
    setProjectToDeleteId(null);
    setSelectedProjectId(null);

    // Pequeño retardo para asegurar que el modal ha desaparecido visualmente
    setTimeout(() => {
      const ref = doc(db, 'tenants', profile.tenantId, 'capex', idToDelete);
      deleteDocumentNonBlocking(ref);
      toast({ title: "Proyecto eliminado" });
      
      // Forzar restauración del body
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }, 100);
  };

  const handleOpenEdit = (project: CapexProject) => {
    setEditingProject(project);
    setAttachments(project.attachments || []);
    setIsDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
              <HardHat className="w-8 h-8 text-accent" />
              Inversiones y Mejoras
            </h2>
            <p className="text-muted-foreground font-medium">Gestión de CAPEX y reparaciones de temporada (Invierno).</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 border-primary text-primary font-bold shadow-sm" onClick={exportToExcel}>
              <Download className="w-4 h-4" /> Exportar Excel
            </Button>
            <Button className="gap-2 bg-primary shadow-lg font-bold" onClick={() => { setEditingProject(null); setAttachments([]); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4" /> Nuevo Proyecto
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Planificado</p>
                  <p className="text-2xl font-black text-primary">{stats.budget.toLocaleString()} €</p>
                </div>
                <Euro className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ejecución Real</p>
                  <p className="text-2xl font-black text-accent">{stats.actual.toLocaleString()} €</p>
                </div>
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50/50 border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Activos CAPEX</p>
                  <p className="text-2xl font-black text-blue-900">{stats.capexCount}</p>
                </div>
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-50/50 border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Mejoras Invierno</p>
                  <p className="text-2xl font-black text-cyan-900">{stats.winterCount}</p>
                </div>
                <Snowflake className="w-5 h-5 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <Tabs value={activeTypeTab} onValueChange={setActiveTypeTab} className="w-full md:w-auto">
            <TabsList className="bg-white border">
              <TabsTrigger value="all">Ver Todos</TabsTrigger>
              <TabsTrigger value="CAPEX" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">CAPEX</TabsTrigger>
              <TabsTrigger value="MEJORA_INVIERNO" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">Mejoras Invierno</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar obra..." 
              className="pl-10 h-11 bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? <p className="col-span-full text-center py-12">Cargando actuaciones...</p> : filteredProjects.map((p) => (
            <Card key={p.id} className="border-none shadow-md hover:shadow-xl transition-all group overflow-hidden cursor-pointer flex flex-col" onClick={() => setSelectedProjectId(p.id)}>
              <div className={cn(
                "h-1.5 w-full", 
                p.projectType === 'CAPEX' ? "bg-blue-600" : "bg-cyan-500"
              )} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1.5">
                    <Badge className={cn("text-[8px] font-black uppercase border-none", p.projectType === 'CAPEX' ? "bg-blue-100 text-blue-700" : "bg-cyan-100 text-cyan-700")}>
                      {p.projectType === 'CAPEX' ? 'CAPEX' : 'INVIERNO'}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase", CATEGORIES.find(c => c.value === p.category)?.color)}>
                      {p.category}
                    </Badge>
                  </div>
                  <Badge className={cn("text-[8px] font-black uppercase", p.priority === 'CRITICA' ? "bg-red-600" : "bg-primary")}>
                    {p.priority}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold group-hover:text-accent transition-colors leading-tight">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <p className="text-xs text-muted-foreground line-clamp-2 italic">"{p.description}"</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="font-black text-muted-foreground uppercase">Presupuesto</p>
                    <p className="font-bold text-primary">{p.estimatedBudget?.toLocaleString() || 0} €</p>
                  </div>
                  <div className="p-2 bg-accent/5 rounded-lg">
                    <p className="font-black text-muted-foreground uppercase">Real</p>
                    <p className="font-bold text-accent">{p.actualCost?.toLocaleString() || 0} €</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-slate-50/50 flex justify-between items-center mt-auto">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase">
                  <Clock className="w-3 h-3" /> {p.status}
                </div>
                <ChevronRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) { setEditingProject(null); setAttachments([]); }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Editar Actuación' : 'Nuevo Proyecto / Mejora'}</DialogTitle>
            <DialogDescription>Define el tipo de mejora y el presupuesto asignado (opcional).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProject} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Origen de la Mejora</Label>
              <Select name="projectType" defaultValue={editingProject?.projectType || "MEJORA_INVIERNO"}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAPEX">Inversión de Capital (CAPEX)</SelectItem>
                  <SelectItem value="MEJORA_INVIERNO">Mejora Invierno (Presupuesto Mantenimiento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título del Proyecto</Label>
              <Input name="title" required defaultValue={editingProject?.title} placeholder="Ej: Renovación Maquinaria Lavandería" />
            </div>
            <div className="space-y-2">
              <Label>Descripción / Justificación</Label>
              <Textarea name="description" required defaultValue={editingProject?.description} placeholder="Indica el motivo de la inversión y el alcance de la obra..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select name="category" defaultValue={editingProject?.category || "REFORMA"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select name="priority" defaultValue={editingProject?.priority || "MEDIA"}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presupuesto Estimado (€) <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span></Label>
                <Input name="estimatedBudget" type="number" step="0.01" defaultValue={editingProject?.estimatedBudget} />
              </div>
              <div className="space-y-2">
                <Label>Coste Real Actual (€)</Label>
                <Input name="actualCost" type="number" step="0.01" defaultValue={editingProject?.actualCost || 0} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input name="startDate" type="date" defaultValue={editingProject?.startDate} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin (Estimada)</Label>
                <Input name="endDate" type="date" defaultValue={editingProject?.endDate} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select name="status" defaultValue={editingProject?.status || "PLANIFICADO"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANIFICADO">Planificado</SelectItem>
                  <SelectItem value="EN_CURSO">En Curso</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas Técnicas</Label>
              <Textarea name="notes" defaultValue={editingProject?.notes} placeholder="Proveedores externos, licencias, etc." />
            </div>

            <div className="space-y-2">
              <Label>Adjuntos (Planos, Presupuestos, Fotos)</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded border overflow-hidden group">
                    {url.toLowerCase().includes('.pdf') ? <FileText className="w-8 h-8 m-auto text-red-500" /> : <Image src={url} alt="" fill className="object-cover" />}
                    <button type="button" onClick={() => setAttachments(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent">
                  {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary" disabled={isUploading}>Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETALLE PROYECTO */}
      <Dialog open={!!selectedProjectId} onOpenChange={() => setSelectedProjectId(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          {selectedProject && (
            <>
              <DialogHeader className="p-6 bg-slate-50 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn("text-[10px] font-black uppercase", selectedProject.projectType === 'CAPEX' ? "bg-blue-600" : "bg-cyan-600")}>
                        {selectedProject.projectType}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] font-black uppercase", CATEGORIES.find(c => c.value === selectedProject.category)?.color)}>
                        {selectedProject.category}
                      </Badge>
                    </div>
                    <DialogTitle className="text-3xl font-black text-primary leading-tight">{selectedProject.title}</DialogTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 text-blue-600" onClick={() => handleOpenEdit(selectedProject)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 text-red-600" onClick={() => setProjectToDeleteId(selectedProject.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Presupuesto Estimado</p>
                    <p className="text-3xl font-black text-primary">{selectedProject.estimatedBudget?.toLocaleString() || 0} €</p>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Inversión Realizada</p>
                    <p className="text-3xl font-black text-accent">{selectedProject.actualCost?.toLocaleString() || 0} €</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción Técnica</h4>
                  <p className="text-sm p-4 bg-muted/30 rounded-xl italic leading-relaxed">"{selectedProject.description}"</p>
                </div>

                {selectedProject.attachments && selectedProject.attachments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Evidencias y Documentación</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedProject.attachments.map((url, i) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(url, '_blank')}>
                          {url.toLowerCase().includes('.pdf') ? (
                            <div className="flex flex-col items-center justify-center h-full bg-slate-50">
                              <FileText className="w-8 h-8 text-red-500 mb-1" />
                              <span className="text-[8px] font-bold text-slate-500">PDF Documento</span>
                            </div>
                          ) : (
                            <Image src={url} alt="" fill className="object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Cronograma</p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      {selectedProject.startDate || 'N/A'} — {selectedProject.endDate || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Registrado por</p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-accent" />
                      {selectedProject.createdBy}
                    </p>
                  </div>
                </div>

                {selectedProject.notes && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed text-xs text-slate-600">
                    <span className="font-black uppercase text-[9px] block mb-1">Notas Técnicas:</span>
                    {selectedProject.notes}
                  </div>
                )}
              </div>

              <DialogFooter className="p-6 bg-slate-50 border-t">
                <Button variant="ghost" onClick={() => setSelectedProjectId(null)}>Cerrar Detalle</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRMACIÓN ELIMINAR */}
      <AlertDialog open={!!projectToDeleteId} onOpenChange={(open) => !open && setProjectToDeleteId(null)}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              ¿Confirmar eliminación del proyecto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se borrará permanentemente la planificación técnica y todos los documentos adjuntos vinculados a esta mejora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold">
              Sí, eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
