
"use client"

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const complianceData = [
  { name: 'Ene', valor: 95 },
  { name: 'Feb', valor: 98 },
  { name: 'Mar', valor: 92 },
  { name: 'Abr', valor: 99 },
  { name: 'May', valor: 97 },
  { name: 'Jun', valor: 100 },
];

const parameterData = [
  { time: '08:00', ph: 7.2, cloro: 1.1 },
  { time: '10:00', ph: 7.3, cloro: 1.0 },
  { time: '12:00', ph: 7.5, cloro: 0.9 },
  { time: '14:00', ph: 7.2, cloro: 1.2 },
  { time: '16:00', ph: 7.1, cloro: 1.1 },
  { time: '18:00', ph: 7.2, cloro: 1.0 },
];

export default function CompliancePage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Estado de Cumplimiento</h2>
            <p className="text-muted-foreground">Monitorización de normativa RD 3/2023 y estándares internos.</p>
          </div>
          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 px-4 py-1 text-sm font-bold">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Certificación Activa
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Índice Global</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2 pb-8">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * 98.2) / 100}
                    className="text-accent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black">98.2%</span>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Cumplimiento</span>
                </div>
              </div>
              <div className="mt-6 w-full space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Objetivo Trimestral</span>
                  <span className="font-bold">95.0%</span>
                </div>
                <Progress value={98.2} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Verificaciones</CardTitle>
              <CardDescription>Porcentaje de registros sin desviaciones críticas</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[80, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Control de pH y Cloro (Hoy)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parameterData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ph" stroke="#28ACDA" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="cloro" stroke="#1F4AA8" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Acciones de Mejora Requeridas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Renovación de Patrones</h4>
                  <p className="text-xs text-red-700 mt-1">El lote de reactivos de Cloro Combinado caduca en 12 días.</p>
                  <Badge className="mt-2 bg-red-600">Prioridad Alta</Badge>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900">Formación RD 3/2023</h4>
                  <p className="text-xs text-blue-700 mt-1">Actualización de protocolos para el equipo de tarde disponible en el portal.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-green-900">Auditoría Superada</h4>
                  <p className="text-xs text-green-700 mt-1">La inspección sanitaria del 15/05 no reportó ninguna no-conformidad.</p>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold gap-1 mt-1">
                    <FileText className="w-3 h-3" /> Ver informe completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
