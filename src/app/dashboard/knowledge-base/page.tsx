
"use client"

import React, { useState, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Tags,
  Zap,
  Droplets,
  Flame,
  Wrench,
  ChevronRight,
  Eye,
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Camera,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Wind,
  Pencil,
  Trash2,
  AlertTriangle
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';

const categories = [
  { name: 'ELECTRICIDAD', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { name: 'PISCINA', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'ACS', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'MAQUINARIA', icon: Wrench, color: 'text-slate-500', bg: 'bg-slate-50' },
  { name: 'NORMATIVA', icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
];

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const kbQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'knowledgeBase'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const { data: articles, isLoading: loading } = useCollection(kbQuery);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter(article => 
      (article.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (article.problemDescription?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (article.tags || []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [articles, searchTerm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...urls]);
      toast({ title: "Archivos añadidos" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de carga" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const tagsValue = formData.get('tags') as string;
    
    const articleData = {
      category: formData.get('category'),
      title: formData.get('title'),
      problemDescription: formData.get('problemDescription'),
      solutionSteps: formData.get('solutionSteps'),
      difficulty: formData.get('difficulty'),
      tags: (tagsValue || "").split(',').map(t => t.trim()).filter(Boolean),
      images: attachments,
      updatedAt: serverTimestamp(),
    };

    if (editingArticle) {
      const artRef = doc(db, 'tenants', profile.tenantId, 'knowledgeBase', editingArticle.id);
      updateDocumentNonBlocking(artRef, articleData);
      toast({ title: "Ficha actualizada" });
      // Update local view if it was selected
      if (selectedArticle?.id === editingArticle.id) {
        setSelectedArticle({ ...editingArticle, ...articleData });
      }
    } else {
      const newArticle = {
        ...articleData,
        viewsCount: 0,
        createdBy: profile.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      const colRef = collection(db, 'tenants', profile.tenantId, 'knowledgeBase');
      addDocumentNonBlocking(colRef, newArticle);
      toast({ title: "Ficha publicada" });
    }

    setAttachments([]);
    setEditingArticle(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (article: any) => {
    setEditingArticle(article);
    setAttachments(article.images || []);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (!db || !profile?.tenantId || !selectedArticle) return;
    
    const artRef = doc(db, 'tenants', profile.tenantId, 'knowledgeBase', selectedArticle.id);
    deleteDocumentNonBlocking(artRef);
    
    toast({ title: "Ficha eliminada" });
    setSelectedArticle(null);
    setIsDeleteDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-accent" />
              Biblioteca Técnica
            </h2>
            <p className="text-muted-foreground font-medium">Guías técnicas y manuales operativos.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setAttachments([]); setEditingArticle(null); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary shadow-lg"><Plus className="w-4 h-4" /> Nueva Ficha</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingArticle ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}</DialogTitle>
                <DialogDescription>Completa los pasos para documentar una avería o procedimiento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveArticle} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Categoría</Label>
                    <Select name="category" defaultValue={editingArticle?.category || "MAQUINARIA"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Dificultad</Label>
                    <Select name="difficulty" defaultValue={editingArticle?.difficulty || "MEDIA"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="BAJA">Baja</SelectItem><SelectItem value="MEDIA">Media</SelectItem><SelectItem value="ALTA">Alta</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input name="title" required defaultValue={editingArticle?.title} placeholder="Ej: Rearme bomba recirculación" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción del Problema</Label>
                  <Textarea name="problemDescription" required defaultValue={editingArticle?.problemDescription} placeholder="Resumen de cuándo ocurre y qué se observa..." />
                </div>
                <div className="space-y-2">
                  <Label>Solución / Pasos a Seguir</Label>
                  <Textarea name="solutionSteps" required defaultValue={editingArticle?.solutionSteps} rows={8} placeholder="1. Verificar cuadro eléctrico...&#10;2. Pulsar botón reset...&#10;3. Comprobar presiones..." />
                </div>
                <div className="space-y-2">
                  <Label>Etiquetas (separadas por comas)</Label>
                  <Input name="tags" defaultValue={editingArticle?.tags?.join(', ')} placeholder="Ej: mantenimiento, preventivo, caldera" />
                </div>
                
                <div className="space-y-2">
                  <Label>Adjuntos (Fotos o PDFs)</Label>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded border overflow-hidden group">
                        {url.toLowerCase().includes('.pdf') ? <FileText className="w-8 h-8 m-auto text-red-500" /> : <Image src={url} alt="" fill className="object-cover" />}
                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent">
                      {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary" disabled={isUploading}>
                    {editingArticle ? 'Actualizar Ficha' : 'Publicar Ficha'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título, problema o etiquetas..." 
            className="pl-10 h-11 bg-white" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        {selectedArticle ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver a la lista</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(selectedArticle)} className="gap-2 text-blue-600">
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              </div>
            </div>

            <Card className="border-none shadow-xl overflow-hidden">
              <div className="h-2 bg-accent w-full" />
              <CardHeader className="bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="w-fit mb-2">{selectedArticle.category}</Badge>
                    <CardTitle className="text-3xl font-black text-primary">{selectedArticle.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-muted-foreground uppercase">
                      <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {selectedArticle.createdBy}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedArticle.createdAt?.toDate?.().toLocaleDateString() || 'Reciente'}</span>
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> DIFICULTAD: {selectedArticle.difficulty}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end max-w-[200px]">
                    {selectedArticle.tags?.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px] uppercase font-bold">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Problema / Síntoma</h4>
                  <section className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl italic text-lg text-slate-700">"{selectedArticle.problemDescription}"</section>
                </div>

                {selectedArticle.images && selectedArticle.images.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Evidencias / Diagramas</h4>
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedArticle.images.map((url: string, i: number) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border shadow-sm cursor-pointer group" onClick={() => window.open(url, '_blank')}>
                          <Image src={url} alt="" fill className="object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="text-white w-6 h-6" />
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Procedimiento de Solución</h4>
                  <section className="prose max-w-none p-8 bg-slate-50 border rounded-2xl whitespace-pre-wrap font-medium text-slate-800 leading-relaxed shadow-inner">
                    {selectedArticle.solutionSteps}
                  </section>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground font-bold uppercase tracking-widest">Cargando biblioteca...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="font-bold text-slate-500">No se han encontrado fichas técnicas.</p>
                <Button variant="link" onClick={() => setIsDialogOpen(true)}>Crear la primera guía técnica</Button>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <Card key={article.id} className="border-none shadow-md hover:shadow-xl transition-all group flex flex-col cursor-pointer overflow-hidden" onClick={() => setSelectedArticle(article)}>
                  <div className="h-1 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[10px] font-black uppercase">{article.category}</Badge>
                      <Badge className={cn("text-[8px] font-black", article.difficulty === 'ALTA' ? "bg-red-500" : article.difficulty === 'MEDIA' ? "bg-orange-500" : "bg-green-500")}>
                        {article.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-accent transition-colors line-clamp-2 leading-tight">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pt-2">
                    <p className="text-xs text-muted-foreground line-clamp-3 italic leading-relaxed">"{article.problemDescription}"</p>
                    <div className="flex flex-wrap gap-1 mt-4">
                      {article.tags?.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-[8px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{tag}</span>
                      ))}
                      {(article.tags?.length || 0) > 3 && <span className="text-[8px] font-bold text-slate-400">+{article.tags.length - 3}</span>}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 bg-slate-50/50 rounded-b-lg flex justify-between items-center mt-auto">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{article.createdBy}</span>
                    <ChevronRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* DIALOGO CONFIRMACION ELIMINAR */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> ¿Eliminar ficha técnica?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se borrará permanentemente la guía <strong>"{selectedArticle?.title}"</strong> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Sí, eliminar permanentemente</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function Maximize2({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
