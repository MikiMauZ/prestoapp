
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-black text-primary mb-8">Política de Privacidad</h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            En PrestoApp nos tomamos muy en serio la privacidad de tus datos. Esta política explica qué datos recopilamos, por qué y cómo los protegemos conforme al Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
          </p>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">1. Responsable del Tratamiento</h2>
            <p className="text-muted-foreground">
              El responsable del tratamiento de los datos recabados a través de esta web es **Miguel Mir Caballero**, creador de PrestoApp, con correo electrónico de contacto: **aplicadia@gmail.com**.
            </p>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">2. Finalidad del Tratamiento</h2>
            <p className="text-muted-foreground">
              Tratamos los datos que nos facilitas (como tu nombre, email y los datos técnicos de tus instalaciones) con las siguientes finalidades exclusivas:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Gestionar tu registro y acceso como usuario en la fase de prueba (Beta) gratuita de nuestra plataforma.</li>
              <li>Prestar el soporte técnico necesario para el uso de la herramienta.</li>
              <li>Enviar notificaciones operativas sobre el estado del software o de tus registros sanitarios (RD 3/2023).</li>
              <li>Atender tus consultas a través del correo de contacto.</li>
            </ul>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">3. Legitimación</h2>
            <p className="text-muted-foreground">
              Al tratarse de una versión de prueba gratuita sin relación comercial ni pagos de por medio, la base legal para el tratamiento de tus datos es tu consentimiento expreso (art. 6.1.a del RGPD), el cual nos otorgas voluntariamente al registrarte en la plataforma o al contactarnos.
            </p>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">4. Derechos del Usuario</h2>
            <p className="text-muted-foreground">
              Como usuario, puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de tus datos. Para ello, solo tienes que enviar un correo electrónico a **aplicadia@gmail.com** indicando el derecho que deseas ejercer.
            </p>
            <p className="text-muted-foreground">
              Asimismo, te informamos de que tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) si consideras que el tratamiento no se ajusta a la normativa vigente.
            </p>
          </section>

          <section className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-slate-900">5. Conservación de Datos y Responsabilidad del Usuario</h2>
            <p className="text-muted-foreground">
              Los datos se conservarán mientras mantengas tu cuenta activa en la fase de prueba de la plataforma, o hasta que solicites su supresión.
            </p>
            <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
              <p className="text-sm font-bold text-orange-900 mb-2">Aviso importante sobre registros sanitarios:</p>
              <p className="text-xs text-orange-800 leading-relaxed">
                Dado que PrestoApp se encuentra en fase Beta, recomendamos encarecidamente a todos los usuarios que mantengan copias de seguridad independientes de sus registros sanitarios obligatorios (RD 3/2023). El titular no se hace responsable de la pérdida de registros legales debido a posibles incidencias técnicas propias de esta fase de validación.
              </p>
            </div>
          </section>

          <p className="text-[10px] text-muted-foreground mt-20 italic">Última actualización: Marzo de 2024</p>
        </div>
      </main>
    </div>
  );
}
