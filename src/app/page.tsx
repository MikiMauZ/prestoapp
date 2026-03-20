
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Droplets, 
  ClipboardCheck, 
  ClipboardList,
  BarChart3, 
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  Package,
  Wrench,
  HardHat,
  ArrowRight,
  Calendar,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { BlogPost } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user } = useUser();
  const db = useFirestore();

  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-hotel');

  // Fetch 3 latest published blog posts
  const blogQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'blogPosts'),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
  }, [db]);

  const { data: latestPosts, isLoading: loadingBlog } = useCollection<BlogPost>(blogQuery);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-primary">PrestoApp</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/blog" className="text-sm font-bold text-primary flex items-center gap-2 hover:text-accent transition-colors">
                <BookOpen className="w-4 h-4" /> BLOG TÉCNICO
              </Link>
              <Link href="/features" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Funcionalidades</Link>
              
              {user ? (
                <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-lg shadow-primary/20" asChild>
                  <Link href="/dashboard">Ir al Panel</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button className="bg-accent hover:bg-accent/90 text-white font-bold px-6 shadow-lg shadow-accent/20" asChild>
                    <Link href="/contact">Solicitar Acceso</Link>
                  </Button>
                </>
              )}
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-primary">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b p-4 space-y-4 animate-in slide-in-from-top-4">
            <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-primary py-2 uppercase tracking-tighter">Blog Técnico</Link>
            <Link href="/features" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium py-2">Funcionalidades</Link>
            <div className="grid gap-2 pt-4">
              {user ? (
                <Button className="w-full bg-primary text-white" asChild>
                  <Link href="/dashboard">Volver al Panel Control</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full" onClick={() => setIsMenuOpen(false)}>
                    <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button className="w-full bg-accent text-white" asChild onClick={() => setIsMenuOpen(false)}>
                    <Link href="/contact">Solicitar Acceso</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in slide-in-from-left-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest">
              Digitalización del Servicio Técnico
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-black text-primary tracking-tighter leading-[0.9]">
                PrestoApp
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] border-l-4 border-accent pl-4 py-1">
                <span><span className="text-accent">P</span>ortal de</span>
                <span><span className="text-accent">R</span>espuesta</span>
                <span><span className="text-accent">E</span>ficiente para</span>
                <span><span className="text-accent">S</span>ervicios</span>
                <span><span className="text-accent">T</span>écnicos</span>
                <span><span className="text-accent">O</span>ptimizados</span>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl font-medium">
                La herramienta operativa definitiva para equipos de mantenimiento. Gestiona averías, stock y protocolos técnicos con trazabilidad digital y tecnología QR.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" className="h-14 md:h-16 px-8 text-lg font-bold bg-primary shadow-xl shadow-primary/20 gap-2 text-white" asChild>
                <Link href={user ? "/dashboard" : "/login"}>
                  {user ? "Volver al Panel" : "Comenzar Ahora"}
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 md:h-16 px-8 text-lg font-bold border-2" asChild>
                <Link href="/features">Explorar Módulos</Link>
              </Button>
            </div>
          </div>
          <div className="relative animate-in zoom-in-95 duration-1000 hidden lg:block">
            <div className="absolute -inset-4 bg-accent/20 rounded-[2rem] blur-3xl -z-10" />
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white">
              <Image 
                src={heroImage?.imageUrl || "https://res.cloudinary.com/dlscxco5p/image/upload/v1772175014/Gemini_Generated_Image_wmenprwmenprwmen_ib6kpy.png"} 
                alt="PrestoApp Hotel Dashboard" 
                width={1200} 
                height={800}
                className="object-cover"
                priority
                data-ai-hint="luxury hotel"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Strengths Section */}
      <section className="py-20 bg-slate-50 border-y overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tighter">Nuestro ADN Operativo</h2>
            <p className="text-muted-foreground font-medium max-w-2xl mx-auto italic text-sm">"Diseñado para que el mantenimiento deje de ser una carga y se convierta en una ventaja competitiva."</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Package, title: "Almacén QR", desc: "Escanea y registra entradas/salidas de químicos y repuestos al instante." },
              { icon: ClipboardList, title: "Logbook Digital", desc: "Comunicación fluida entre turnos y trazabilidad de cada incidencia." },
              { icon: BookOpen, title: "Biblioteca Técnica", desc: "Accede a manuales de reparación directamente desde la maquinaria con un QR." },
              { icon: HardHat, title: "Mejoras e Inversiones", desc: "Control de CAPEX y puestas a punto de temporada con seguimiento de costes." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-sm border hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-primary">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Digital Support Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-50 order-2 lg:order-1">
            <Image 
              src="https://res.cloudinary.com/dlscxco5p/image/upload/v1772400891/Gemini_Generated_Image_3vxyem3vxyem3vxy_knh862.png" 
              alt="Digital technical support" 
              width={800} 
              height={600}
              className="object-cover"
              data-ai-hint="water analysis"
            />
          </div>
          <div className="space-y-8 order-1 lg:order-2">
            <h2 className="text-3xl md:text-5xl font-black text-primary leading-tight uppercase tracking-tighter">Apoyo Digital al Control Sanitario</h2>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
              Simplificamos la burocracia técnica. Registra tus verificaciones con <strong>evidencia fotográfica</strong> y <strong>firma digital</strong>, asegurando que los datos sean reales y trazables ante cualquier auditoría.
            </p>
            <ul className="space-y-4">
              {[
                "Registro diario de parámetros con cálculos de desviación.",
                "Sellado digital de registros mensuales para evitar alteraciones.",
                "Calculadoras automáticas de dosificación técnica.",
                "Generación de memorias técnicas PDF para intervenciones especiales."
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 font-bold text-slate-700">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Latest Blog Posts Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div className="space-y-4">
              <Badge className="bg-accent text-white uppercase tracking-widest px-4">Actualidad Técnica</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-primary uppercase tracking-tighter">Novedades del Sector</h2>
              <p className="text-lg text-muted-foreground max-w-2xl font-medium">
                Descubre consejos, guías operativas y noticias sobre ingeniería hotelera en nuestro blog oficial.
              </p>
            </div>
            <Button variant="outline" className="hidden md:flex gap-2 border-primary text-primary font-bold px-6 h-12" asChild>
              <Link href="/blog">Ver todo el blog <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>

          {loadingBlog ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="mt-4 font-bold text-muted-foreground uppercase text-xs tracking-widest">Sincronizando noticias...</p>
            </div>
          ) : !latestPosts || latestPosts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-bold italic">Próximamente publicaremos nuestras primeras guías técnicas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <Card className="h-full border-none shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col bg-white">
                    <div className="relative h-52 overflow-hidden">
                      <Image 
                        src={post.featuredImage || `https://picsum.photos/seed/${post.id}/800/600`} 
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-white/90 text-primary border-none text-[10px] font-black uppercase">
                          {post.tags?.[0] || 'TÉCNICO'}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-accent" /> {post.createdAt?.toDate?.().toLocaleDateString() || 'RECIENTE'}</span>
                        <span className="flex items-center gap-1"><UserIcon className="w-3 h-3 text-accent" /> {post.author}</span>
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
                        Leer más <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          <Button variant="outline" className="w-full md:hidden gap-2 border-primary text-primary font-bold h-14" asChild>
            <Link href="/blog">Explorar todo el Blog <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary w-8 h-8" />
              <span className="text-2xl font-black text-primary tracking-tighter">PrestoApp</span>
            </div>
            <p className="text-muted-foreground max-w-xs leading-relaxed italic text-sm font-medium">
              "Portal de Respuesta Eficiente para Servicios Técnicos Optimizados"
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-xs">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/blog" className="hover:text-primary transition-colors font-bold">Blog Técnico</Link></li>
                <li><Link href="/features" className="hover:text-primary transition-colors">Funcionalidades</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-xs">Compañía</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contacto</Link></li>
                <li><Link href="/legal" className="hover:text-primary transition-colors">Aviso Legal</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacidad</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground font-medium">
          © {new Date().getFullYear()} PrestoApp Systems. La eficiencia como estándar.
        </div>
      </footer>
    </div>
  );
}
