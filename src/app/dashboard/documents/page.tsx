
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
  Download,
  Camera
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
import { uploadToCloudinary } from '@/lib/cloudinary';
import { DocumentRecord, DocumentCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'FILE' | 'LINK'>('FILE');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setUploadedUrls(prev => [...prev, ...urls]);
      toast({ title: "Archivos listos", description: "Cargados correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Fallo al subir archivos." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const finalUrl = uploadType === 'FILE' ? uploadedUrls[0] : formData.get('externalUrl') as string;

    if (!finalUrl && uploadType === 'LINK') {
      toast({ variant: "destructive", title: "Falta el enlace", description: "Debes poner un enlace externo." });
      return;
    }

    const newDoc = {
      title: formData.get('title') as string,
      category: formData.get('category') as DocumentCategory,
      type: uploadType,
      url: finalUrl || '',
      urls: uploadedUrls,
      expiryDate: formData.get('expiryDate') || null,
      notes: formData.get('notes') as string,
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'documents');
    addDocumentNonBlocking(colRef, newDoc);

    toast({ title: "Documento archivado" });
    setUploadedUrls([]);
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!db || !profile?.tenantId) return;
    const ref = doc(db, 'tenants', profile.tenantId, 'documents', id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Documento eliminado" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <FileBadge className="w-8 h-8 text-accent" />
              Gestión Documental
            </h2>
            <p className="text-muted-foreground font-medium">Archivo centralizado de certificados técnicos.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setUploadedUrls([]); setUploadType('FILE'); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg"><Plus className="w-4 h-4" /> Añadir Documento</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Archivar Certificado</DialogTitle>
                <DialogDescription>Sube uno o varios archivos o vincula un enlace externo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDocument} className="space-y-4 py-4">
                <div className="space-y-2"><Label>Título</Label><Input name="title" required placeholder="Ej: Certificado Legionella 2024" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Categoría</Label>
                    <Select name="category" defaultValue="TECNICO">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEGAL">Legal / Sanitario</SelectItem>
                        <SelectItem value="TECNICO">Técnico / Mantenimiento</SelectItem>
                        <SelectItem value="FORMACION">Formación / PRL</SelectItem>
                        <SelectItem value="OTROS">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Caducidad</Label><Input name="expiryDate" type="date" /></div>
                </div>

                <div className="space-y-2">
                  <Label>Método</Label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    <Button type="button" variant={uploadType === 'FILE' ? 'default' : 'ghost'} className="flex-1 h-8 text-xs" onClick={() => setUploadType('FILE')}>Archivos</Button>
                    <Button type="button" variant={uploadType === 'LINK' ? 'default' : 'ghost'} className="flex-1 h-8 text-xs" onClick={() => setUploadType('LINK')}>Enlace</Button>
                  </div>
                </div>

                {uploadType === 'FILE' ? (
                  <div className="space-y-2">
                    <Label>Archivos / Fotos</Label>
                    <div className="flex flex-wrap gap-2">
                      {uploadedUrls.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded border overflow-hidden group">
                          {url.toLowerCase().includes('.pdf') ? <FileText className="w-8 h-8 m-auto text-red-500" /> : <Image src={url} alt="" fill className="object-cover" />}
                          <button type="button" onClick={() => setUploadedUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent">
                        {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2"><Label>URL Externa</Label><Input name="externalUrl" placeholder="https://..." /></div>
                )}

                <DialogFooter className="pt-4">
                  <Button type="submit" className="bg-primary" disabled={isUploading}>Guardar Documento</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-10 h-11 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="LEGAL">Legal</SelectItem>
              <SelectItem value="TECNICO">Técnico</SelectItem>
              <SelectItem value="FORMACION">Formación</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? <p className="col-span-full text-center py-12">Cargando...</p> : filteredDocs.map((doc) => (
            <Card key={doc.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <CardHeader className="pb-3 border-b flex flex-row justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    {doc.type === 'FILE' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold truncate max-w-[150px]">{doc.title}</CardTitle>
                    <Badge variant="secondary" className="text-[8px] font-black uppercase mt-1">{doc.category}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500" onClick={() => handleDelete(doc.id)}><Trash2 className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="pt-4">
                {doc.expiryDate && (
                  <div className={cn("flex items-center gap-2 text-[10px] font-bold mb-3 p-2 rounded", new Date(doc.expiryDate) < new Date() ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600")}>
                    <Calendar className="w-3 h-3" /> Caduca: {doc.expiryDate}
                  </div>
                )}
                {doc.urls && doc.urls.length > 1 && (
                  <p className="text-[10px] font-bold text-muted-foreground mb-2">{doc.urls.length} Archivos adjuntos</p>
                )}
                <Button className="w-full gap-2 h-9 text-xs font-bold" variant="secondary" asChild>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.type === 'FILE' ? <Download className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />} Ver Documento
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
