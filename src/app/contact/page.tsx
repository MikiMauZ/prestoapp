
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, ChevronLeft, Mail, MapPin, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedLegal) {
      toast({
        variant: "destructive",
        title: "Aceptación necesaria",
        description: "Debes aceptar la política de privacidad para continuar.",
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Mensaje Enviado",
        description: "Nuestro equipo se pondrá en contacto contigo a través de aplicadia@gmail.com.",
      });
      (e.target as HTMLFormElement).reset();
      setAcceptedLegal(false);
    }, 1500);
  };

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
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-black text-primary">¿Hablamos?</h1>
                <p className="text-lg text-muted-foreground">
                  Estamos aquí para ayudarte a transformar tu departamento técnico. Solicita información sobre la versión Beta o resuelve tus dudas sobre normativa.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Correo Electrónico</p>
                    <p className="text-lg font-bold">aplicadia@gmail.com</p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Sede</p>
                    <p className="text-lg font-bold">Madrid, España</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-accent rounded-3xl text-white relative overflow-hidden group">
                <MessageSquare className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-2">Versión Beta Activa</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  Estamos en fase de lanzamiento. Tu feedback es fundamental para construir la mejor herramienta técnica del sector.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-2xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                Formulario de Contacto
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" placeholder="Ej: Juan" required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel">Hotel / Empresa</Label>
                    <Input id="hotel" placeholder="Nombre comercial" required className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Corporativo</Label>
                  <Input id="email" type="email" placeholder="j.perez@hotel.com" required className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">¿En qué podemos ayudarte?</Label>
                  <Textarea id="message" placeholder="Describe brevemente tu necesidad..." className="min-h-[120px]" required />
                </div>
                
                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox 
                    id="legal" 
                    checked={acceptedLegal} 
                    onCheckedChange={(checked) => setAcceptedLegal(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor="legal" 
                      className="text-xs font-medium text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      He leído y acepto la <Link href="/privacy" className="text-primary hover:underline font-bold">Política de Privacidad</Link> y el <Link href="/legal" className="text-primary hover:underline font-bold">Aviso Legal</Link>.
                    </Label>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-bold gap-2" disabled={loading || !acceptedLegal}>
                  {loading ? "Enviando..." : <><Send className="w-5 h-5" /> Enviar Solicitud</>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
