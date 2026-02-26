
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: "Credenciales incorrectas o cuenta no activa. Contacte con su administrador.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-background to-background">
      <div className="mb-8 self-start max-w-md mx-auto w-full">
        <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-primary">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>
      
      <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary shadow-xl shadow-primary/20 rotate-3 transition-transform hover:rotate-0 duration-300">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary pt-4">PrestoApp</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs text-center">Gestión Técnica Hotelera</p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <div className="h-2 bg-accent w-full" />
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Acceso Profesionales</CardTitle>
            <CardDescription>Introduce tus credenciales para gestionar el servicio técnico</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nombre@hotel.com" 
                    className="pl-10 h-11 border-muted" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    className="pl-10 h-11 border-muted" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? "Verificando..." : "Entrar al Panel"}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                El acceso está restringido a personal autorizado. Si no tiene cuenta, solicítela a su responsable de mantenimiento.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
