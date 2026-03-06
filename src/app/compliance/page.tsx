
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronLeft, Droplets, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function ComplianceInfoPage() {
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
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-4">
            <Badge className="bg-accent text-white mb-2">Normativa RD 3/2023</Badge>
            <h1 className="text-4xl md:text-5xl font-black text-primary">Cumplimiento Técnico Sanitario</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              El nuevo **Real Decreto 3/2023** establece los criterios técnico-sanitarios de la calidad del agua de consumo humano y las instalaciones asociadas. PrestoApp ha sido diseñado específicamente para cumplir con estas exigencias en el sector hospitality.
            </p>
          </div>

          <div className="grid gap-8">
            <section className="bg-white p-8 rounded-3xl border space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Droplets className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Control de Calidad del Agua</h2>
              </div>
              <p className="text-muted-foreground">
                La normativa exige un control exhaustivo de parámetros como cloro libre, combinado y pH. PrestoApp garantiza:
              </p>
              <ul className="space-y-4">
                {[
                  "Registro diario de mediciones físico-químicas.",
                  "Cálculo automático de desviaciones y alarmas inmediatas.",
                  "Protocolos de actuación ante contaminaciones microbiológicas (E. coli, Legionella).",
                  "Generación de memorias técnicas de desinfección."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-900 p-8 rounded-3xl text-white space-y-6">
              <div className="flex items-center gap-3 text-accent">
                <ShieldCheck className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Bloqueo Legal de Registros</h2>
              </div>
              <p className="text-slate-400">
                A diferencia del papel o hojas de cálculo tradicionales, PrestoApp implementa un sistema de **sellado digital**:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="font-bold mb-2">Inalterabilidad</h4>
                  <p className="text-xs text-slate-400 italic">Una vez firmado el control de patrones mensual, el registro se bloquea. No puede ser editado ni borrado a posteriori, garantizando la veracidad ante inspecciones.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="font-bold mb-2">Evidencia Fotográfica</h4>
                  <p className="text-xs text-slate-400 italic">Obligamos al técnico a capturar la lectura real del fotómetro en el momento de la verificación, asegurando la trazabilidad total.</p>
                </div>
              </div>
            </section>

            <section className="bg-orange-50 p-8 rounded-3xl border border-orange-100 space-y-4">
              <div className="flex items-center gap-3 text-orange-600">
                <AlertTriangle className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Gestión de Legionella</h2>
              </div>
              <p className="text-sm text-orange-800 leading-relaxed font-medium">
                Digitalizamos el Libro de Registro de Mantenimiento de las instalaciones de riesgo (ACS, torres, spas) asegurando el cumplimiento de las frecuencias de limpieza y desinfección según el plan de autocontrol de cada hotel.
              </p>
              <Button variant="link" className="p-0 text-orange-700 font-bold" asChild>
                <Link href="/contact" className="gap-2"><FileText className="w-4 h-4" /> Solicitar guía técnica gratuita</Link>
              </Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest ${className}`}>
      {children}
    </span>
  );
}
