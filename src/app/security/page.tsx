
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronLeft, Lock, Database, Server, UserCheck } from 'lucide-react';

export default function SecurityPage() {
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
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-primary">Seguridad de Nivel Empresarial</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tus datos técnicos y operativos son críticos. Por eso utilizamos la infraestructura más segura del mundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold">Cifrado de Extremo a Extremo</h3>
              <p className="text-muted-foreground leading-relaxed">
                Toda la información transmitida entre tus dispositivos y nuestros servidores viaja cifrada mediante protocolos SSL/TLS de 256 bits. Tus contraseñas y datos sensibles nunca se guardan en texto plano.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                <Database className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold">Infraestructura Firebase</h3>
              <p className="text-muted-foreground leading-relaxed">
                PrestoApp se apoya en Google Cloud Platform. Los datos se almacenan en Firestore, una base de datos NoSQL altamente disponible con copias de seguridad automáticas y aislamiento físico de la información.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                <UserCheck className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">Control Multi-tenant Estricto</h3>
              <p className="text-muted-foreground leading-relaxed">
                Nuestra arquitectura de seguridad garantiza que los datos de un hotel sean inaccesibles para cualquier otro usuario. Cada organización trabaja en un silo de datos lógico y seguro.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <Server className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold">Cumplimiento RGPD</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cumplimos estrictamente con el Reglamento General de Protección de Datos. Servidores ubicados en la Unión Europea para garantizar la soberanía de tus datos y la de tus empleados.
              </p>
            </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-center">
            <p className="text-sm font-bold text-slate-600">
              ¿Necesitas un informe detallado de ciberseguridad para tu departamento de IT? 
              <Link href="/contact" className="text-primary hover:underline ml-1">Contacta con nosotros.</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
