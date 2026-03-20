
"use client"

import React from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
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
  BookOpen, 
  Plus, 
  Search, 
  Eye,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { BlogPost } from '@/lib/types';
import Link from 'next/link';
import { deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function BlogManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');

  const blogQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: posts, isLoading } = useCollection<BlogPost>(blogQuery);

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este artículo permanentemente?')) return;
    const ref = doc(db!, 'blogPosts', id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Artículo eliminado" });
  };

  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    return posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [posts, searchTerm]);

  return (
    <SuperAdminLayout>
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-200">Gestión del Blog</h2>
          <p className="text-slate-500 font-medium">Publica contenidos para la web principal de PrestoApp.</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 px-6 h-12 shadow-lg shadow-red-900/40" asChild>
          <Link href="/super-admin/blog/editor">
            <Plus className="w-5 h-5" />
            Nueva Entrada
          </Link>
        </Button>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 text-slate-200 overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-slate-800 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <Input 
              placeholder="Buscar por título..." 
              className="pl-10 h-11 bg-slate-950 border-slate-700 text-slate-200" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-slate-800">
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Título del Artículo</TableHead>
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14 text-center">Estado</TableHead>
                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Fecha</TableHead>
                <TableHead className="text-right text-slate-400 font-black uppercase text-[10px] tracking-widest h-14">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">Cargando contenidos...</TableCell></TableRow>
              ) : filteredPosts.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500 italic">No hay artículos publicados.</TableCell></TableRow>
              ) : filteredPosts.map((post) => (
                <TableRow key={post.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 truncate max-w-[300px]">{post.title}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Slug: {post.slug}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {post.published ? (
                      <Badge className="bg-green-500/10 text-green-500 font-black text-[9px] px-2.5 py-0.5 border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> PUBLICADO
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/10 text-slate-500 font-black text-[9px] px-2.5 py-0.5 border-none">
                        <XCircle className="w-3 h-3 mr-1" /> BORRADOR
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      {post.createdAt?.toDate?.().toLocaleDateString() || 'Reciente'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white" asChild>
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-400" asChild>
                        <Link href={`/super-admin/blog/editor?id=${post.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => handleDelete(post.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
