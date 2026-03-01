
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
  X
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
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';

const categories = [
  { name: 'ELECTRICIDAD', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { name: 'PISCINA', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'ACS', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'MAQUINARIA', icon: Wrench, color: 'text-slate-500', bg: 'bg-slate-50' },
];

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  
  // Image upload states
  const [isUploading, setIsUploading] = useState(false);
  const [articlePhotos, setArticlePhotos] = useState<string[]>([]);
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
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setArticlePhotos(prev => [...prev, ...urls]);
      toast({ title: "Evidencia subida", description: "La imagen se ha adjuntado a la solución." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de carga", description: "No se pudo subir la imagen." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateArticle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const newArticle = {
      category: formData.get('category'),
      title: formData.get('title'),
      problemDescription: formData.get('problemDescription'),
      solutionSteps: formData.get('solutionSteps'),
      difficulty: formData.get('difficulty'),
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      viewsCount: 0,
      images: articlePhotos,
      createdBy: profile.displayName || user.email,
      createdById: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'knowledgeBase');
    addDocumentNonBlocking(colRef, newArticle);

    toast({
      title: "Artículo publicado",
      description: "La solución técnica ha sido añadida a la base de conocimientos.",
    });
    setArticlePhotos([]);
    setIsDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              < BookOpen className="w-8 h-8 text-accent" />
              Libro Técnico
            </h2>
            <p className="text-muted-foreground font-medium">Base de conocimiento estructurada para averías y soluciones.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setArticlePhotos([]);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="w-4 h-4" />
                Nueva Documentación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Documentar Nueva Solución Técnica</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateArticle} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Sistema</Label>
                    <Select name="category" defaultValue="MAQUINARIA">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ELECTRICIDAD">Electricidad</SelectItem>
                        <SelectItem value="PISCINA">Piscina</SelectItem>
                        <SelectItem value="ACS">ACS / ACS</SelectItem>
                        <SelectItem value="MAQUINARIA">Maquinaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Dificultad</Label>
                    <Select name="difficulty" defaultValue="MEDIA">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJA">Baja</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Artículo</Label>
                  <Input id="title" name="title" required placeholder="Ej: Reset de variador de frecuencia Danfoss" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problemDescription">Descripción del Problema</Label>
                  <Textarea id="problemDescription" name="problemDescription" required placeholder="¿Qué fallaba exactamente?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solutionSteps">Pasos para la Solución</Label>
                  <Textarea id="solutionSteps" name="solutionSteps" required rows={5} placeholder="Paso 1, Paso 2..." />
                </div>
                
                <div className="space-y-2">
                  <Label>Esquema o Foto de Referencia</Label>
                  <div className="flex flex-wrap gap-2">
                    {articlePhotos.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <Image src={url} alt={`Ref ${i}`} fill className="object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setArticlePhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md"
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
                      <span className="text-[10px] font-bold uppercase">Subir</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={handleFileUpload} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (separados por coma)</Label>
                  <Input id="tags" name="tags" placeholder="variador, motor, bomba, reset" />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary" disabled={isUploading}>
                    {isUploading ? "Cargando..." : "Publicar Artículo"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedArticle ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Volver al listado
            </Button>
            
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
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Problema Identificado
                  </h4>
                  <div className="p-6 bg-red-50/30 border border-red-100 rounded-2xl italic text-lg text-slate-700">
                    "{selectedArticle.problemDescription}"
                  </div>
                </section>

                {selectedArticle.images && selectedArticle.images.length > 0 && (
                  <section>
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Esquemas y Referencias Visuales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedArticle.images.map((url: string, i: number) => (
                        <div key={i} className="relative aspect-video rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                          <Image src={url} alt={`Referencia ${i}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Guía de Solución Paso a Paso
                  </h4>
                  <div className="prose max-w-none p-6 bg-slate-50 border rounded-2xl whitespace-pre-wrap font-medium leading-relaxed">
                    {selectedArticle.solutionSteps}
                  </div>
                </section>

                <div className="flex flex-wrap gap-2 pt-4">
                  {selectedArticle.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="px-3 py-1 text-[10px] font-bold">#{tag}</Badge>
                  ))}
                </div>
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
                  <h3 className="text-2xl font-bold text-white">¿Qué estás buscando solucionar hoy?</h3>
                  <div className="relative">
                    <Search className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                    <Input 
                      placeholder="Busca por avería, código de error o equipo..." 
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
                    <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground">{cat.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Tags className="w-5 h-5 text-accent" />
                Documentación Técnica Reciente
              </h3>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[1,2,3].map(i => <Card key={i} className="h-48 animate-pulse bg-slate-100" />)}
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed">
                  <p className="text-muted-foreground font-bold">No se encontraron artículos que coincidan con la búsqueda.</p>
                  <Button variant="link" onClick={() => setSearchTerm('')}>Limpiar búsqueda</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.map((article) => (
                    <Card key={article.id} className="border-none shadow-md hover:shadow-xl transition-all group flex flex-col">
                      {article.images && article.images.length > 0 && (
                        <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                          <Image src={article.images[0]} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
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
                         <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded",
                            article.difficulty === 'BAJA' ? 'bg-green-100 text-green-700' :
                            article.difficulty === 'MEDIA' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                          )}>{article.difficulty}</span>
                         </div>
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 font-bold text-accent"
                          onClick={() => setSelectedArticle(article)}
                        >
                           Ver Solución <ChevronRight className="w-4 h-4" />
                         </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
