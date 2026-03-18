
"use client"

import React from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Loader2, 
  BookOpen, 
  User as UserIcon, 
  Calendar, 
  AlertTriangle,
  ChevronLeft,
  Wrench,
  Maximize2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function PublicArticlePage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const articleId = params.articleId as string;
  const db = useFirestore();

  const articleRef = useMemoFirebase(() => {
    if (!db || !tenantId || !articleId) return null;
    return doc(db, 'tenants', tenantId, 'knowledgeBase', articleId);
  }, [db, tenantId, articleId]);

  const { data: article, isLoading } = useDoc(articleRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Cargando guía técnica...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">GUÍA NO ENCONTRADA</h1>
        <p className="text-slate-500 max-w-xs mb-8">El manual que buscas no existe o ha sido retirado por el administrador técnico.</p>
        <Button asChild className="bg-primary px-8">
          <Link href="/">Volver a PrestoApp</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Navbar Minimalista para móvil */}
      <nav className="h-16 bg-white border-b sticky top-0 z-50 flex items-center px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-primary tracking-tighter">PrestoApp KB</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4 md:pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-2">
          <Badge className="w-fit bg-accent/10 text-accent hover:bg-accent/20 border-none font-black text-[10px] tracking-widest uppercase">
            {article.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-bold text-muted-foreground uppercase">
            <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {article.createdBy}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {article.createdAt?.toDate?.().toLocaleDateString() || 'Reciente'}</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-white",
              article.difficulty === 'ALTA' ? "bg-red-500" : article.difficulty === 'MEDIA' ? "bg-orange-500" : "bg-green-500"
            )}>DIFICULTAD: {article.difficulty}</span>
          </div>
        </div>

        <Card className="border-none shadow-xl ring-1 ring-slate-200 overflow-hidden">
          <CardHeader className="bg-white border-b pb-4">
            <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Problema Detectado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-lg text-slate-700 font-medium italic border-l-4 border-accent pl-4 bg-accent/5 py-4 rounded-r-xl">
              "{article.problemDescription}"
            </p>
          </CardContent>
        </Card>

        {article.images && article.images.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Esquemas y Referencias Visuales</h4>
            <div className="grid grid-cols-1 gap-4">
              {article.images.map((url: string, i: number) => (
                <div key={i} className="relative aspect-video rounded-2xl overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-200" onClick={() => window.open(url, '_blank')}>
                  <Image src={url} alt="" fill className="object-cover" />
                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md p-2 rounded-lg text-white">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procedimiento Operativo de Solución</h4>
          <Card className="border-none shadow-lg ring-1 ring-slate-200">
            <CardContent className="p-0">
              <div className="prose max-w-none p-6 md:p-8 whitespace-pre-wrap font-body text-slate-800 leading-relaxed text-sm md:text-base">
                {article.solutionSteps}
              </div>
            </CardContent>
          </Card>
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4">
            {article.tags.map((tag: string, i: number) => (
              <span key={i} className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-1 rounded-md uppercase">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <footer className="pt-10 pb-6 text-center space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fin del manual técnico oficial</p>
          <div className="h-px bg-slate-200 w-20 mx-auto" />
          <p className="text-[9px] text-slate-400 max-w-[200px] mx-auto">Esta información es para uso exclusivo del personal de mantenimiento autorizado.</p>
        </footer>
      </main>
    </div>
  );
}
