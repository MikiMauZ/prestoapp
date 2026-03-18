
"use client"

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Loader2, 
  ChevronLeft, 
  Calendar, 
  User as UserIcon,
  Tag as TagIcon,
  Clock,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { BlogPost } from '@/lib/types';

export default function BlogPostDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const db = useFirestore();

  const postQuery = useMemoFirebase(() => {
    if (!db || !slug) return null;
    return query(
      collection(db, 'blogPosts'),
      where('slug', '==', slug),
      where('published', '==', true),
      limit(1)
    );
  }, [db, slug]);

  const { data: posts, isLoading } = useCollection<BlogPost>(postQuery);
  const post = posts?.[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 font-bold text-muted-foreground uppercase text-xs tracking-widest">Cargando lectura...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-4">
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">Artículo no encontrado</h1>
        <p className="text-slate-500 mb-8 max-w-sm">Lo sentimos, pero el contenido que buscas no está disponible actualmente.</p>
        <Button asChild className="bg-primary px-8">
          <Link href="/blog">Volver al Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Estilos para el contenido inyectado */}
      <style>{`
        .blog-content h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1.5rem; color: #1F4AA8; }
        .blog-content h2 { font-size: 1.875rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #1F4AA8; }
        .blog-content h3 { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; color: #1F4AA8; }
        .blog-content p { margin-bottom: 1.5rem; line-height: 1.8; color: #334155; }
        .blog-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .blog-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .blog-content li { margin-bottom: 0.5rem; }
        .blog-content blockquote { border-left: 4px solid #28ACDA; padding: 1.5rem; background: #f8fafc; font-style: italic; color: #475569; border-radius: 0 1rem 1rem 0; margin: 2rem 0; }
        .blog-content img { border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); margin: 2.5rem 0; }
        .blog-content a { color: #28ACDA; text-decoration: underline; font-weight: 600; }
      `}</style>

      <nav className="h-20 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 flex items-center px-4 md:px-8">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-primary tracking-tighter hidden sm:block">PrestoApp Blog</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-xs font-bold uppercase">
              <Link href="/blog"><ChevronLeft className="w-4 h-4" /> Todos los artículos</Link>
            </Button>
          </div>
        </div>
      </nav>

      <header className="relative h-[50vh] md:h-[60vh] w-full bg-slate-900">
        <Image 
          src={post.featuredImage || `https://picsum.photos/seed/${post.id}/1600/900`} 
          alt={post.title}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap gap-2">
              {post.tags?.map((tag, i) => (
                <Badge key={i} className="bg-accent text-white border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-accent" /> POR {post.author}</span>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> {post.createdAt?.toDate?.().toLocaleDateString() || 'RECUPERANDO FECHA'}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> 5 MIN LECTURA</span>
            </div>
          </div>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div 
          className="blog-content prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">¿Te ha gustado este contenido?</p>
            <div className="flex gap-4">
              <Button variant="outline" size="sm" className="gap-2 font-bold text-xs" onClick={() => window.print()}>
                <Share2 className="w-4 h-4" /> Compartir Artículo
              </Button>
            </div>
          </div>
          
          <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100 max-w-sm text-center">
            <h4 className="font-bold text-primary mb-2 italic">PrestoApp Systems</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Descubre cómo digitalizar tu hotel con nuestra tecnología de autocontrol sanitario.
            </p>
            <Button className="mt-4 bg-primary text-white font-bold w-full" asChild>
              <Link href="/contact">Solicitar información</Link>
            </Button>
          </div>
        </div>
      </article>

      <footer className="bg-slate-50 py-12 border-t">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <ShieldCheck className="w-8 h-8 text-primary mx-auto opacity-20" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Fin de la Lectura - PrestoApp Knowledge</p>
        </div>
      </footer>
    </div>
  );
}
