
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Droplets, 
  ClipboardCheck, 
  BarChart3, 
  ChevronLeft,
  Package,
  ShoppingCart,
  Wrench,
  BookOpen,
  FileBadge,
  HardHat
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: Package,
      title: "Almacén Inteligente (QR)",
      desc: "Gestión de stock móvil. Escanea los productos químicos o repuestos para registrar entradas y salidas sin teclear."
    },
    {
      icon: ClipboardCheck,
      title: "Apoyo al Autocontrol",
      desc: "Registros técnicos con evidencia fotográfica obligatoria y firma digital. Facilita la trazabilidad exigida en inspecciones."
    },
    {
      icon: BookOpen,
      title: "Biblioteca de Conocimiento",
      desc: "Evita la pérdida de saber técnico. Manuales de reparación accesibles mediante códigos QR pegados en la maquinaria."
    },
    {
      icon: HardHat,
      title: "Mejoras e Invierno",
      desc: "Planifica reformas y puestas a punto. Control presupuestario de CAPEX y seguimiento de grandes proyectos técnicos."
    },
    {
      icon: ShoppingCart,
      title: "Gestión de Suministros",
      desc: "Módulo de pedidos integrado con tu stock. Controla borradores, envíos y recepciones de material técnico."
    },
    {
      icon: Wrench,
      title: "Control de Instrumentación",
      desc: "Seguimiento de calibraciones de fotómetros y equipos de medida. Historial de verificaciones trazables."
    },
    {
      icon: FileBadge,
      title: "Archivo Técnico",
      desc: "Centraliza certificados, licencias y boletines con alertas de caducidad para que nunca se pase una fecha legal."
    },
    {
      icon: BarChart3,
      title: "Métricas de Rendimiento",
      desc: "Analítica real de la operativa: distribución de incidencias por áreas y eficacia del equipo de mantenimiento."
    }
  ];

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
            <Link href="/"><ChevronLeft className="w-4 h-4" /> Volver al inicio</Link>
          </Button>
        </div>
      </nav>

      <main className="py-20 px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-primary uppercase">Módulos Operativos</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              PRESTO: Portal de Respuesta Eficiente para Servicios Técnicos Optimizados. Todo lo necesario para digitalizar tu operativa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <div key={i} className="p-8 bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm font-medium">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-primary rounded-[3rem] p-12 text-center text-white space-y-6 shadow-2xl shadow-primary/20">
            <h2 className="text-3xl font-bold">¿Deseas profesionalizar tu servicio técnico?</h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto font-medium">PrestoApp te ayuda a eliminar el papel y mejorar la eficiencia de tu equipo desde el primer día.</p>
            <Button size="lg" variant="secondary" className="font-bold px-8 h-14" asChild>
              <Link href="/contact">Solicitar Acceso Beta</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
