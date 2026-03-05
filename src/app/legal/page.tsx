"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronLeft } from 'lucide-react';

export default function LegalNoticePage() {
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
        <div className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="text-4xl font-black text-primary mb-8">Aviso Legal</h1>
          
          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">1. Datos Identificativos</h2>
            <p className="text-muted-foreground leading-relaxed">
              En cumplimiento del deber de información recogido en la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se informa de que el titular y responsable de esta página web y del proyecto "PrestoApp" es:
            </p>
            <ul className="list-none space-y-1 text-muted-foreground font-medium">
              <li><strong>Titular:</strong> Miguel Mir Caballero</li>
              <li><strong>Email de contacto:</strong> aplicadia@gmail.com</li>
            </ul>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">2. Propiedad Intelectual e Industrial</h2>
            <p className="text-muted-foreground leading-relaxed">
              Miguel Mir Caballero, por sí o como cesionario, es titular de todos los derechos de propiedad intelectual e industrial de esta página web y de la plataforma PrestoApp, así como de los elementos contenidos en la misma (código, estructura, diseño, interfaces, textos, logotipos y bases de datos).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Quedan expresamente prohibidas la reproducción, distribución y comunicación pública de la totalidad o parte de los contenidos y herramientas de esta web con fines comerciales sin la autorización expresa del titular.
            </p>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">3. Exclusión de Garantías y Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              PrestoApp se encuentra actualmente en fase de prueba (versión Beta). Por tanto, la plataforma se ofrece "tal cual", sin garantías expresas o implícitas de ningún tipo.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              El titular no se hace responsable de los daños y perjuicios que pudieran derivarse de: caídas del servidor, pérdida temporal de datos, errores de código, falta de disponibilidad del portal o cualquier otra incidencia técnica. El usuario comprende y acepta que, al utilizar una versión en pruebas, asume estos riesgos.
            </p>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">4. Legislación Aplicable y Jurisdicción</h2>
            <p className="text-muted-foreground leading-relaxed">
              La relación entre el titular y el USUARIO se regirá por la normativa española vigente. Cualquier controversia se someterá a los Juzgados y tribunales de la ciudad de Madrid (España), salvo que la ley aplicable disponga lo contrario de forma imperativa.
            </p>
          </section>

          <p className="text-[10px] text-muted-foreground mt-20 italic">Última actualización: Marzo de 2024</p>
        </div>
      </main>
    </div>
  );
}
