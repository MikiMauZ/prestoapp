
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  ChevronLeft, 
  Calendar, 
  User as UserIcon, 
  ArrowRight,
  Loader2,
  BookOpen
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { BlogPost } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BlogListPage() {
  const db = useFirestore();

  const blogQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'blogPosts'),
      where('published', '==', true),
      orderBy('createdAt', 'desc')
    );
  }, [db]);

  const { data: posts, isLoading } = useCollection<BlogPost>(blogQuery);

  return (
    <div className="min-h-screen bg-background">
      <nav className="h-20 bg-white border-b flex items-center px-4 md:px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-primary">PrestoApp</span>
          </Link>
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/"><ChevronLeft className="w-4 h-4" /> Volver</Link>
          </Button>
        </div>
      </nav>

      <main className="py-20 px-4">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <Badge className="bg-accent text-white mb-2">Blog de Ingeniería Hotelera</Badge>
            <h1 className="text-4xl md:text-6xl font-black text-primary tracking-tight">Novedades y Guías Técnicas</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Descubre las últimas tendencias en mantenimiento, normativa sanitaria y eficiencia operativa para hoteles.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="mt-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Cargando artículos...</p>
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-white">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Próximamente publicaremos nuestros primeros artículos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <Card className="h-full border-none shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="relative h-56 bg-slate-100 overflow-hidden">
                      <Image 
                        src={post.featuredImage || `https://picsum.photos/seed/${post.id}/800/600`} 
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        data-ai-hint="maintenance architecture"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        {post.tags?.slice(0, 2).map((tag, i) => (
                          <Badge key={i} className="bg-white/90 text-primary border-none text-[10px] font-black uppercase">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.createdAt?.toDate?.().toLocaleDateString() || 'Reciente'}</span>
                        <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {post.author}</span>
                      </div>
                      <CardTitle className="text-xl font-bold group-hover:text-accent transition-colors leading-tight line-clamp-2">
                        {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.excerpt || 'Descubre los detalles técnicos en este nuevo artículo de PrestoApp...'}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0 border-t bg-slate-50/50 group-hover:bg-slate-50 transition-colors">
                      <Button variant="link" className="p-0 h-12 text-primary font-black gap-2 uppercase text-xs">
                        Leer artículo completo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
