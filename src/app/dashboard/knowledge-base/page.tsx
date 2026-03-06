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
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { uploadToR2 } from '@/lib/r2';
import Image from 'next/image';

const categories = [
  { name: 'ELECTRICIDAD', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { name: 'PISCINA', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'ACS', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'MAQUINARIA', icon: Wrench, color: 'text-slate-500', bg: 'bg-slate-50' },
  { name: 'NORMATIVA', icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
  { name: 'MANUALES', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50' },
  { name: 'CLIMATIZACIÓN', icon: Wind, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { name: 'SEGURIDAD', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
];

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  
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
      article.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [articles, searchTerm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToR2(file));
      const urls = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...urls]);
      toast({ title: "Archivo en R2", description: "Documento adjuntado correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error R2", description: "No se pudo subir el archivo. Revisa CORS en Cloudflare." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const articleData = {
      category: formData.get('category'),
      title: formData.get('title'),
      problemDescription: formData.get('problemDescription'),
      solutionSteps: formData.get('solutionSteps'),
      difficulty: formData.get('difficulty'),
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      images: attachments,
      updatedAt: serverTimestamp(),
    };

    if (editingArticle) {
      const artRef = doc(db, 'tenants', profile.tenantId, 'knowledgeBase', editingArticle.id);
      updateDocumentNonBlocking(artRef, articleData);
      toast({ title: "Ficha actualizada", description: "Los cambios han sido guardados." });
    } else {
      const newArticle = {
        ...articleData,
        viewsCount: 0,
        createdBy: profile.displayName || user.email,
        createdById: user.uid,
        createdAt: serverTimestamp(),
      };
      const colRef = collection(db, 'tenants', profile.tenantId, 'knowledgeBase');
      addDocumentNonBlocking(colRef, newArticle);
      toast({ title: "Ficha publicada", description: "Se ha añadido a la biblioteca." });
    }

    setAttachments([]);
    setEditingArticle(null);
    setIsDialogOpen(false);
  };

  const handleOpenEdit = (article: any) => {
    setEditingArticle(article);
    setAttachments(article.images || []);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !articleToDelete) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'knowledgeBase', articleToDelete);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Ficha eliminada" });
    setArticleToDelete(null);
    setSelectedArticle(null);
  };

  const isPDF = (url: string) => url.toLowerCase().includes('.pdf');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-accent" />
              Biblioteca Técnica y Normativa
            </h2>
            <p className="text-muted-foreground font-medium">Manuales, Reales Decretos y guías técnicas en Cloudflare R2.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setAttachments([]); setEditingArticle(null); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="w-4 h-4" />
                Subir Documentación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingArticle ? 'Editar Ficha' : 'Nueva Ficha de Biblioteca'}</DialogTitle>
                <DialogDescription>Completa los detalles técnicos y adjunta manuales o fotos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveArticle} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Tipo / Sistema</Label>
                    <Select name="category" defaultValue={editingArticle?.category || "MAQUINARIA"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                        <SelectItem value="OTRO">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Complejidad Técnica</Label>
                    <Select name="difficulty" defaultValue={editingArticle?.difficulty || "MEDIA"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJA">Baja / Informativo</SelectItem>
                        <SelectItem value="MEDIA">Media / Técnico</SelectItem>
                        <SelectItem value="ALTA">Alta / Especializado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Documento</Label>
                  <Input id="title" name="title" required defaultValue={editingArticle?.title} placeholder="Ej: RD 3/2023 o Manual Bomba X" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problemDescription">Descripción / Resumen</Label>
                  <Textarea id="problemDescription" name="problemDescription" required defaultValue={editingArticle?.problemDescription} placeholder="Resumen del contenido..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solutionSteps">Contenido Principal / Pasos</Label>
                  <Textarea id="solutionSteps" name="solutionSteps" required rows={5} defaultValue={editingArticle?.solutionSteps} placeholder="Detalles técnicos..." />
                </div>
                
                <div className="space-y-2">
                  <Label>Adjuntos R2 (PDFs o Fotos)</Label>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-slate-50 flex items-center justify-center">
                        {isPDF(url) ? (
                          <div className="flex flex-col items-center gap-1">
                            <FileText className="w-8 h-8 text-red-500" />
                            <span className="text-[8px] font-bold">PDF R2</span>
                          </div>
                        ) : (
                          <Image src={url} alt={`Ref ${i}`} fill className="object-cover" />
                        )}
                        <button 
                          type="button" 
                          onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent transition-colors",
                        isUploading && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                      <span className="text-[10px] font-bold uppercase">Subir R2</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" multiple onChange={handleFileUpload} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (separados por coma)</Label>
                  <Input id="tags" name="tags" defaultValue={editingArticle?.tags?.join(', ')} placeholder="normativa, manual, etc." />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary" disabled={isUploading}>
                    {isUploading ? "Subiendo..." : editingArticle ? "Guardar Cambios" : "Publicar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedArticle ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenEdit(selectedArticle)}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:bg-red-50" onClick={() => setArticleToDelete(selectedArticle.id)}>
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              </div>
            </div>
            
            <Card className="border-none shadow-xl overflow-hidden">
              <div className="h-2 bg-accent w-full" />
              <CardHeader className="bg-slate-50/50 pb-8">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-primary/10 text-primary border-none">{selectedArticle.category}</Badge>
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedArticle.createdAt?.toDate?.().toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {selectedArticle.createdBy}</span>
                  </div>
                </div>
                <CardTitle className="text-4xl font-black text-primary leading-tight">{selectedArticle.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-10 pt-8">
                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Resumen Informativo
                  </h4>
                  <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl italic text-lg text-slate-700">
                    "{selectedArticle.problemDescription}"
                  </div>
                </section>

                {selectedArticle.images && selectedArticle.images.length > 0 && (
                  <section>
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Documentación y Adjuntos (R2)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedArticle.images.map((url: string, i: number) => (
                        <div key={i} className="group relative rounded-2xl overflow-hidden border shadow-sm transition-all hover:shadow-md">
                          {isPDF(url) ? (
                            <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center gap-4">
                              <FileText className="w-16 h-16 text-red-500" />
                              <Button variant="outline" size="sm" asChild>
                                <a href={url} target="_blank" rel="noreferrer">Ver Documento PDF</a>
                              </Button>
                            </div>
                          ) : (
                            <div className="relative aspect-video">
                              <Image src={url} alt={`Referencia ${i}`} fill className="object-cover" />
                              <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Button variant="secondary" size="sm">Ampliar Imagen</Button>
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Contenido Detallado
                  </h4>
                  <div className="prose max-w-none p-6 bg-slate-50 border rounded-2xl whitespace-pre-wrap font-medium leading-relaxed">
                    {selectedArticle.solutionSteps}
                  </div>
                </section>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card className="bg-primary p-1 border-none shadow-xl overflow-hidden">
              <CardContent className="p-8 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <BookOpen className="w-40 h-40 text-white" />
                </div>
                <div className="relative z-10 space-y-4 max-w-2xl">
                  <h3 className="text-2xl font-bold text-white">Biblioteca Técnica del Hotel</h3>
                  <div className="relative">
                    <Search className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                    <Input 
                      placeholder="Busca manuales, normativas, Reales Decretos..." 
                      className="h-14 pl-12 text-lg bg-white/95 border-none shadow-inner" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Card 
                  key={cat.name} 
                  className="hover:border-accent transition-all cursor-pointer group"
                  onClick={() => setSearchTerm(cat.name)}
                >
                  <CardContent className="p-6 flex flex-col items-center gap-3">
                    <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform", cat.bg)}>
                      <cat.icon className={cn("w-8 h-8", cat.color)} />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">{cat.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Tags className="w-5 h-5 text-accent" />
                Fichas Recientes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  [1,2,3].map(i => <Card key={i} className="h-48 animate-pulse bg-slate-100" />)
                ) : filteredArticles.map((article) => (
                  <Card key={article.id} className="border-none shadow-md hover:shadow-xl transition-all group flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className="bg-primary/10 text-primary border-none text-[10px]">{article.category}</Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{article.viewsCount || 0}</span>
                        </div>
                      </div>
                      <CardTitle className="text-lg group-hover:text-accent transition-colors line-clamp-2">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 italic">
                        "{article.problemDescription}"
                      </p>
                    </CardContent>
                    <CardFooter className="border-t pt-4 bg-slate-50/50 rounded-b-lg flex justify-between items-center mt-auto">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 font-bold text-accent"
                        onClick={() => setSelectedArticle(article)}
                      >
                         Abrir Ficha <ChevronRight className="w-4 h-4" />
                       </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-red-600 w-5 h-5" /> ¿Eliminar esta ficha?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción borrará permanentemente la documentación de la biblioteca técnica.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Eliminar Ficha</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
