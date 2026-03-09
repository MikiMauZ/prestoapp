
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
      (article.problemDescription?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
      toast({ title: "Ficha actualizada" });
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
              <DialogHeader><DialogTitle>Nueva Ficha Técnica</DialogTitle></DialogHeader>
              <form onSubmit={handleSaveArticle} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Categoría</Label>
                    <Select name="category" defaultValue="MAQUINARIA">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Dificultad</Label>
                    <Select name="difficulty" defaultValue="MEDIA">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="BAJA">Baja</SelectItem><SelectItem value="MEDIA">Media</SelectItem><SelectItem value="ALTA">Alta</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Título</Label><Input name="title" required placeholder="Ej: Rearme bomba recirculación" /></div>
                <div className="space-y-2"><Label>Descripción</Label><Textarea name="problemDescription" required placeholder="Resumen del problema..." /></div>
                <div className="space-y-2"><Label>Solución / Pasos</Label><Textarea name="solutionSteps" required rows={5} placeholder="Instrucciones paso a paso..." /></div>
                
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
                      {isUploading ? <Loader2 className="animate-spin w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                  </div>
                </div>

                <DialogFooter className="pt-4"><Button type="submit" className="bg-primary" disabled={isUploading}>Publicar Ficha</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedArticle ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
            <Card className="border-none shadow-xl overflow-hidden">
              <div className="h-2 bg-accent w-full" />
              <CardHeader className="bg-slate-50/50">
                <Badge className="w-fit mb-2">{selectedArticle.category}</Badge>
                <CardTitle className="text-3xl font-black text-primary">{selectedArticle.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <section className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl italic text-lg text-slate-700">"{selectedArticle.problemDescription}"</section>
                {selectedArticle.images && selectedArticle.images.length > 0 && (
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedArticle.images.map((url: string, i: number) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden border shadow-sm cursor-pointer" onClick={() => window.open(url, '_blank')}>
                        <Image src={url} alt="" fill className="object-cover" />
                      </div>
                    ))}
                  </section>
                )}
                <section className="prose max-w-none p-6 bg-slate-50 border rounded-2xl whitespace-pre-wrap font-medium">{selectedArticle.solutionSteps}</section>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="border-none shadow-md hover:shadow-xl transition-all group flex flex-col cursor-pointer" onClick={() => setSelectedArticle(article)}>
                <CardHeader>
                  <Badge variant="outline" className="w-fit mb-2">{article.category}</Badge>
                  <CardTitle className="text-lg group-hover:text-accent transition-colors line-clamp-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1"><p className="text-sm text-muted-foreground line-clamp-3 italic">"{article.problemDescription}"</p></CardContent>
                <CardFooter className="border-t pt-4 bg-slate-50/50 rounded-b-lg flex justify-between items-center mt-auto">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{article.createdBy}</span>
                  <ChevronRight className="w-4 h-4 text-accent" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
