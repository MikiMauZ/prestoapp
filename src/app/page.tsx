
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Droplets, 
  ClipboardCheck, 
  BarChart3, 
  CheckCircle2,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser } from '@/firebase';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user } = useUser();

  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-hotel');
  const waterImage = PlaceHolderImages.find(img => img.id === 'water-test');

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
              <Link href="/features" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Características</Link>
              <Link href="/compliance" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Normativa RD 3/2023</Link>
              
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
                    <Link href="/contact">Solicitar Demo</Link>
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
            <Link href="/features" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium py-2">Características</Link>
            <Link href="/compliance" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium py-2">Normativa RD 3/2023</Link>
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
                    <Link href="/contact">Solicitar Demo</Link>
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
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Líder en Sector Hotelero
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-primary leading-[1.1] tracking-tight">
              Control Técnico y Calidad <span className="text-accent">Sin Errores.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              La plataforma definitiva para la gestión de servicios técnicos hoteleros. Digitaliza tus verificaciones de agua según el <strong>RD 3/2023</strong> con bloqueo legal de registros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="h-14 md:h-16 px-8 text-lg font-bold bg-primary shadow-xl shadow-primary/20 gap-2 text-white" asChild>
                <Link href={user ? "/dashboard" : "/login"}>
                  {user ? "Volver al Panel" : "Comenzar Ahora"}
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 md:h-16 px-8 text-lg font-bold border-2" asChild>
                <Link href="/features">Ver Funcionalidades</Link>
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

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-primary">Diseñado para la Excelencia Técnica</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Elimina el papel y los errores humanos con herramientas diseñadas específicamente para el personal de mantenimiento hotelero.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Droplets, 
                title: "Calidad del Agua", 
                desc: "Cálculos automáticos de cloro libre, combinado y pH con alertas de desviación instantáneas.",
                color: "text-blue-500",
                bg: "bg-blue-50"
              },
              { 
                icon: ClipboardCheck, 
                title: "Bloqueo Legal", 
                desc: "Registros inalterables con evidencia fotográfica obligatoria para cumplir con auditorías externas.",
                color: "text-green-500",
                bg: "bg-green-50"
              },
              { 
                icon: BarChart3, 
                title: "Analítica Predictiva", 
                desc: "Visualiza tendencias de cumplimiento y anticípate a problemas técnicos antes de que afecten al huésped.",
                color: "text-accent",
                bg: "bg-accent/10"
              },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-secondary/20 border hover:shadow-xl transition-all group">
                <div className={`${f.bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`${f.color} w-8 h-8`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 md:py-24 bg-primary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="relative order-2 lg:order-1">
             <Image 
                src={waterImage?.imageUrl || "https://res.cloudinary.com/dlscxco5p/image/upload/v1772400891/Gemini_Generated_Image_3vxyem3vxyem3vxy_knh862.png"} 
                alt="Water Quality Compliance" 
                width={600} 
                height={400}
                className="rounded-3xl shadow-2xl rotate-2 object-cover"
                data-ai-hint="water analysis"
              />
              <div className="absolute -bottom-6 -right-6 bg-accent p-4 md:p-6 rounded-2xl shadow-xl animate-bounce">
                <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12" />
              </div>
          </div>
          <div className="space-y-6 order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-black leading-tight">Cumplimiento Estricto <br /><span className="text-accent">RD 3/2023</span></h2>
            <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed">
              Adaptamos su plan de control sanitario a la nueva legislación española. Nuestro sistema garantiza que cada medición de fotómetro y turbidímetro sea veraz y esté debidamente documentada.
            </p>
            <ul className="space-y-4">
              {[
                "Verificaciones mensuales obligatorias con patrón",
                "Registro de técnico y hora inalterables",
                "Evidencia visual de cada parámetro",
                "Exportación instantánea para Sanidad"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-semibold text-sm md:text-base">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Button size="lg" variant="secondary" className="mt-4 md:mt-8 font-bold px-10 w-full md:w-auto text-primary" asChild>
              <Link href="/compliance">Saber más sobre RD 3/2023</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary w-8 h-8" />
              <span className="text-2xl font-black text-primary">PrestoApp</span>
            </div>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              La plataforma inteligente para el mantenimiento y control de calidad en el sector hospitality.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-xs">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary transition-colors">Funcionalidades</Link></li>
                <li><Link href="/compliance" className="hover:text-primary transition-colors">Normativa</Link></li>
                <li><Link href="/security" className="hover:text-primary transition-colors">Seguridad</Link></li>
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
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PrestoApp Systems. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
