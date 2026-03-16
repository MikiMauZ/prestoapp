
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
  FileBadge
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: Droplets,
      title: "Control de Aguas",
      desc: "Gestión completa de piscinas, aljibes y depósitos. Calculadoras automáticas de dosificación química y protocolos de emergencia microbiológica."
    },
    {
      icon: ClipboardCheck,
      title: "Bloqueo Legal RD 3/2023",
      desc: "Registros inalterables con firma digital del técnico y evidencia fotográfica obligatoria. Diseñado para superar auditorías de Sanidad."
    },
    {
      icon: Package,
      title: "Gestión de Stock",
      desc: "Control de inventario de químicos y repuestos con alertas automáticas de stock mínimo para evitar roturas de suministro."
    },
    {
      icon: ShoppingCart,
      title: "Pedidos Técnicos",
      desc: "Módulo CRUD de pedidos a proveedores integrado con el catálogo de productos y estados de seguimiento (Borrador, Enviado, Recibido)."
    },
    {
      icon: Wrench,
      title: "Instrumentación",
      desc: "Control de calibraciones de fotómetros y turbidímetros. Historial de verificaciones con patrones trazables."
    },
    {
      icon: BookOpen,
      title: "Libro Técnico (KB)",
      desc: "Base de conocimientos estructurada para averías recurrentes. Manuales de actuación y guías de reparación paso a paso."
    },
    {
      icon: FileBadge,
      title: "Archivo Documental",
      desc: "Gestión centralizada de certificados, memorias técnicas y licencias con control de fechas de caducidad."
    },
    {
      icon: BarChart3,
      title: "Métricas Operativas",
      desc: "Análisis de rendimiento, distribución de incidencias por áreas y tendencias de cumplimiento sanitario."
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
            <h1 className="text-4xl md:text-5xl font-black text-primary">Funcionalidades Avanzadas</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diseñado por técnicos hoteleros para técnicos hoteleros. Todo lo que necesitas para gestionar el mantenimiento y la calidad sanitaria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <div key={i} className="p-8 bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-primary rounded-3xl p-12 text-center text-white space-y-6">
            <h2 className="text-3xl font-bold">¿Listo para digitalizar tu servicio técnico?</h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto">Únete a los hoteles líderes que ya confían en PrestoApp para su cumplimiento normativo.</p>
            <Button size="lg" variant="secondary" className="font-bold px-8 h-14" asChild>
              <Link href="/login">Acceso Profesionales</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
