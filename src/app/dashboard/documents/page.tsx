
"use client"

import React, { useState, useMemo, useRef } from 'react';
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
  FileBadge, 
  Plus, 
  Search, 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Trash2, 
  ExternalLink,
  Calendar,
  Filter,
  Loader2,
  X,
  FileCheck,
  AlertTriangle,
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
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { uploadToR2 } from '@/lib/r2';
import { DocumentRecord, DocumentCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'FILE' | 'LINK'>('FILE');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const docsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'documents'),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.tenantId]);

  const { data: documents, isLoading: loading } = useCollection<DocumentRecord>(docsQuery);

  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCategory === 'ALL' || doc.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [documents, searchTerm, activeCategory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadToR2(file);
      setUploadedUrl(url);
      toast({ title: "Documento listo", description: "El archivo se ha subido a Cloudflare R2 correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de carga", description: "No se pudo subir a R2. Revisa la configuración." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const finalUrl = uploadType === 'FILE' ? uploadedUrl : formData.get('externalUrl') as string;

    if (!finalUrl) {
      toast({ variant: "destructive", title: "Falta el archivo", description: "Debes subir un archivo o poner un enlace." });
      return;
    }

    const newDoc = {
      title: formData.get('title') as string,
      category: formData.get('category') as DocumentCategory,
      type: uploadType,
      url: finalUrl,
      expiryDate: formData.get('expiryDate') || null,
      notes: formData.get('notes') as string,
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'documents');
    addDocumentNonBlocking(colRef, newDoc);

    toast({ title: "Documento archivado", description: "El certificado ha sido guardado correctamente." });
    setUploadedUrl(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!db || !profile?.tenantId) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'documents', id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Documento eliminado" });
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <FileBadge className="w-8 h-8 text-accent" />
              Gestión Documental (R2)
            </h2>
            <p className="text-muted-foreground font-medium">Archivo centralizado de boletines y licencias en Cloudflare R2.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setUploadedUrl(null);
              setUploadType('FILE');
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="w-4 h-4" />
                Añadir Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Archivar Nuevo Certificado</DialogTitle>
                <DialogDescription>Sube un archivo directo a R2 o vincula un enlace externo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDocument} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Documento</Label>
                  <Input id="title" name="title" required placeholder="Ej: Certificado Legionella 2024" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category" defaultValue="TECNICO">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEGAL">Legal / Sanitario</SelectItem>
                        <SelectItem value="TECNICO">Técnico / Mantenimiento</SelectItem>
                        <SelectItem value="FORMACION">Formación / PRL</SelectItem>
                        <SelectItem value="OTROS">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Fecha de Caducidad (Opcional)</Label>
                    <Input id="expiryDate" name="expiryDate" type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Método de Origen</Label>
                  <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                    <Button 
                      type="button" 
                      variant={uploadType === 'FILE' ? 'default' : 'ghost'} 
                      className="flex-1 text-xs h-8"
                      onClick={() => setUploadType('FILE')}
                    >
                      <Upload className="w-3 h-3 mr-2" /> Cloudflare R2
                    </Button>
                    <Button 
                      type="button" 
                      variant={uploadType === 'LINK' ? 'default' : 'ghost'} 
                      className="flex-1 text-xs h-8"
                      onClick={() => setUploadType('LINK')}
                    >
                      <LinkIcon className="w-3 h-3 mr-2" /> Enlace Externo
                    </Button>
                  </div>
                </div>

                {uploadType === 'FILE' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                      uploadedUrl ? "border-green-500 bg-green-50 text-green-700" : "border-slate-300 hover:border-accent hover:bg-slate-50"
                    )}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    ) : uploadedUrl ? (
                      <>
                        <FileCheck className="w-8 h-8" />
                        <span className="text-xs font-bold">Documento en R2 Listo</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400" />
                        <span className="text-xs font-medium">Sube PDFs o imágenes a Cloudflare R2</span>
                      </>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="externalUrl">URL del Documento (Drive/Sharepoint)</Label>
                    <Input id="externalUrl" name="externalUrl" placeholder="https://drive.google.com/..." />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas</Label>
                  <Textarea id="notes" name="notes" placeholder="Breve descripción o recordatorio..." />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary" disabled={isUploading}>Guardar Documento</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por título..." 
                className="pl-10 h-11 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="h-11 bg-white">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Categoría" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las categorías</SelectItem>
              <SelectItem value="LEGAL">Legal / Sanitario</SelectItem>
              <SelectItem value="TECNICO">Técnico / Mantenimiento</SelectItem>
              <SelectItem value="FORMACION">Formación / PRL</SelectItem>
              <SelectItem value="OTROS">Otros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="col-span-full text-center py-12">Cargando archivo...</p>
          ) : filteredDocs.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">No hay documentos que coincidan con la búsqueda.</p>
            </div>
          ) : filteredDocs.map((doc) => {
            const expired = isExpired(doc.expiryDate);
            return (
              <Card key={doc.id} className="border-none shadow-sm hover:shadow-md transition-all group">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      doc.type === 'FILE' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {doc.type === 'FILE' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold line-clamp-1">{doc.title}</CardTitle>
                      <Badge variant="outline" className="text-[9px] font-black uppercase mt-1">
                        {doc.category}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pb-4">
                  {doc.expiryDate && (
                    <div className={cn(
                      "flex items-center gap-2 text-xs font-bold mb-2 p-2 rounded-md",
                      expired ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                    )}>
                      {expired ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                      Caduca: {new Date(doc.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                  {doc.notes && <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3">"{doc.notes}"</p>}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                    <span>Subido por {doc.createdBy}</span>
                    <span>{doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : 'Reciente'}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    className="w-full gap-2 h-9 text-xs font-bold" 
                    variant={doc.type === 'FILE' ? 'secondary' : 'outline'}
                    asChild
                  >
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {doc.type === 'FILE' ? <Download className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                      {doc.type === 'FILE' ? 'Abrir en Cloudflare R2' : 'Abrir en Nube Externa'}
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}