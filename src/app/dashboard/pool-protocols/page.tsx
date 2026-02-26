"use client"

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Waves, 
  AlertTriangle, 
  Calculator, 
  FileText, 
  BookOpen, 
  ShoppingCart,
  Zap,
  Droplets,
  Skull,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Loader2,
  ClipboardList
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { POOL_PRODUCTS, CHEMICAL_PRODUCTS_LIST, calculateChlorineDose, calculatePHDose } from '@/lib/utils/pool-calculations';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import jsPDF from 'jspdf';

export default function PoolProtocolsPage() {
  const [activeTab, setActiveTab] = useState('emergency');
  const [activeEmergency, setActiveEmergency] = useState<string | null>(null);
  const [activeCorrection, setActiveCorrection] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);

  // States for Calculator
  const [calcVolume, setVolume] = useState<number>(0);
  const [calcProduct, setProduct] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(0);
  const [result, setResult] = useState<any>(null);

  // State for Orders
  const [orderQuantities, setOrderQuantities] = useState<Record<string, { wave: number, sky: number }>>({});

  const handleCalculateEmergency = () => {
    if (!calcVolume || !calcProduct || !activeEmergency) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Indica el volumen y producto." });
      return;
    }

    let targetPpm = 0;
    let time = "";
    let steps: string[] = [];

    switch (activeEmergency) {
      case 'solid': 
        targetPpm = 2; 
        time = "30 minutos"; 
        steps = [
          "Cerrar piscina inmediatamente.",
          "Retirar heces con red (NUNCA aspirar).",
          "Desinfectar utensilios con lejía al 1%.",
          "Aplicar dosis calculada (2 ppm).",
          "Mantener 30 min antes de reabrir."
        ];
        break;
      case 'liquid': 
        targetPpm = 20; 
        time = "13 horas"; 
        steps = [
          "Cierre total inmediato.",
          "Elevar cloro a 20 ppm.",
          "Mantener recirculación 13 horas.",
          "Aspirar fondo al alcantarillado.",
          "Contralavado de filtros.",
          "Neutralizar cloro antes de abrir."
        ];
        break;
      case 'pseudomonas': 
        targetPpm = 12.5; 
        time = "24-48 horas"; 
        steps = [
          "Cierre inmediato.",
          "Limpieza mecánica profunda de skimmers y bordes.",
          "Renovación de 10-15cm de agua superficial.",
          "Hipercloración 12.5 ppm durante 24-48h.",
          "Análisis negativo antes de reabrir."
        ];
        break;
    }

    const dose = calculateChlorineDose(calcVolume, targetPpm, 0, calcProduct);
    const unit = POOL_PRODUCTS.chlorine[calcProduct as keyof typeof POOL_PRODUCTS.chlorine].type === 'liquid' ? 'L' : 'kg';

    setResult({
      dose: dose.toFixed(2),
      unit,
      time,
      steps,
      isEmergency: true,
      title: activeEmergency === 'solid' ? 'Heces Sólidas' : activeEmergency === 'liquid' ? 'Heces Líquidas (Hipercloración)' : 'Pseudomonas'
    });
  };

  const handleCalculateCorrection = () => {
    if (!calcVolume || !calcProduct || !activeCorrection) return;

    let dose = 0;
    let unit = 'kg';
    let steps: string[] = [];

    if (activeCorrection === 'chlorine') {
      dose = calculateChlorineDose(calcVolume, targetValue, currentValue, calcProduct);
      unit = POOL_PRODUCTS.chlorine[calcProduct as keyof typeof POOL_PRODUCTS.chlorine].type === 'liquid' ? 'L' : 'kg';
      steps = ["Disolver producto", "Distribuir uniformemente", "Recirculación 1h", "Verificar niveles"];
    } else {
      dose = calculatePHDose(calcVolume, targetValue, currentValue, calcProduct, activeCorrection === 'phUp' ? 'up' : 'down');
      unit = POOL_PRODUCTS.phDown[calcProduct as keyof typeof POOL_PRODUCTS.phDown]?.type === 'liquid' ? 'L' : 'kg';
      steps = ["Añadir producto", "Esperar 2-4 horas", "Medir pH de nuevo"];
    }

    setResult({
      dose: dose.toFixed(2),
      unit,
      time: "2-4 horas",
      steps,
      isEmergency: false,
      title: activeCorrection === 'chlorine' ? 'Ajuste de Cloro' : 'Ajuste de pH'
    });
  };

  const exportResultPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('MEMORIA DE ACTUACIÓN - CALIDAD AGUA', 20, 20);
    doc.setFontSize(12);
    doc.text(`Hotel: ${profile?.tenantName || 'N/A'}`, 20, 35);
    doc.text(`Protocolo: ${result.title}`, 20, 45);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 55);
    
    doc.setFontSize(14);
    doc.text('RESULTADO DEL CÁLCULO:', 20, 75);
    doc.setFontSize(12);
    doc.text(`Dosis a aplicar: ${result.dose} ${result.unit}`, 20, 85);
    doc.text(`Producto: ${calcProduct}`, 20, 95);
    doc.text(`Tiempo tratamiento: ${result.time}`, 20, 105);

    doc.text('PASOS A SEGUIR:', 20, 125);
    result.steps.forEach((step: string, i: number) => {
      doc.text(`${i + 1}. ${step}`, 25, 135 + (i * 10));
    });

    doc.save(`protocolo-piscina-${Date.now()}.pdf`);
  };

  const handleOrderChange = (index: number, hotel: 'wave' | 'sky', value: string) => {
    const val = parseInt(value) || 0;
    setOrderQuantities(prev => ({
      ...prev,
      [index]: { ... (prev[index] || { wave: 0, sky: 0 }), [hotel]: val }
    }));
  };

  const generateWhatsAppOrder = () => {
    let text = `*🏨 PEDIDO QUÍMICOS PISCINAS*\n📅 Fecha: ${new Date().toLocaleDateString()}\n\n`;
    
    let hasWave = false;
    let waveText = `*🌊 HOTEL WAVE:*\n`;
    let hasSky = false;
    let skyText = `*☁️ HOTEL SKY:*\n`;

    CHEMICAL_PRODUCTS_LIST.forEach((prod, i) => {
      const q = orderQuantities[i];
      if (q?.wave > 0) {
        waveText += `• ${prod}: ${q.wave}\n`;
        hasWave = true;
      }
      if (q?.sky > 0) {
        skyText += `• ${prod}: ${q.sky}\n`;
        hasSky = true;
      }
    });

    if (hasWave) text += waveText + "\n";
    if (hasSky) text += skyText + "\n";

    if (!hasWave && !hasSky) {
      toast({ title: "Pedido vacío", description: "Indica cantidades antes de compartir." });
      return;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Waves className="w-5 h-5 text-accent" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Calculadora Pedrosa</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Protocolos de Actuación</h2>
            <p className="text-muted-foreground">Gestión técnica de calidad del agua y emergencias sanitarias RD 742/2013.</p>
          </div>
        </div>

        <Tabs defaultValue="emergency" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-white border w-full justify-start h-12 overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="emergency" className="gap-2 shrink-0"><Zap className="w-4 h-4" /> Emergencias</TabsTrigger>
            <TabsTrigger value="correction" className="gap-2 shrink-0"><Calculator className="w-4 h-4" /> Correcciones</TabsTrigger>
            <TabsTrigger value="report" className="gap-2 shrink-0"><ClipboardList className="w-4 h-4" /> Memorias</TabsTrigger>
            <TabsTrigger value="info" className="gap-2 shrink-0"><BookOpen className="w-4 h-4" /> Manuales</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 shrink-0"><ShoppingCart className="w-4 h-4" /> Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="emergency" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={cn("cursor-pointer transition-all border-2", activeEmergency === 'solid' ? "border-orange-500 bg-orange-50" : "hover:border-orange-200")}
                onClick={() => { setActiveEmergency('solid'); setResult(null); }}
              >
                <CardContent className="p-6 text-center">
                  <Droplets className="w-10 h-10 mx-auto text-orange-600 mb-3" />
                  <h3 className="font-bold">Heces Sólidas</h3>
                  <p className="text-[10px] text-muted-foreground uppercase">2 ppm × 30 min</p>
                </CardContent>
              </Card>
              <Card 
                className={cn("cursor-pointer transition-all border-2", activeEmergency === 'liquid' ? "border-red-500 bg-red-50" : "hover:border-red-200")}
                onClick={() => { setActiveEmergency('liquid'); setResult(null); }}
              >
                <CardContent className="p-6 text-center">
                  <Skull className="w-10 h-10 mx-auto text-red-600 mb-3" />
                  <h3 className="font-bold">Heces Líquidas</h3>
                  <p className="text-[10px] text-muted-foreground uppercase">20 ppm × 13 h</p>
                </CardContent>
              </Card>
              <Card 
                className={cn("cursor-pointer transition-all border-2", activeEmergency === 'pseudomonas' ? "border-purple-500 bg-purple-50" : "hover:border-purple-200")}
                onClick={() => { setActiveEmergency('pseudomonas'); setResult(null); }}
              >
                <CardContent className="p-6 text-center">
                  <Waves className="w-10 h-10 mx-auto text-purple-600 mb-3" />
                  <h3 className="font-bold">Pseudomonas</h3>
                  <p className="text-[10px] text-muted-foreground uppercase">12.5 ppm × 48 h</p>
                </CardContent>
              </Card>
            </div>

            {activeEmergency && (
              <Card className="border-none shadow-lg animate-in slide-in-from-top-4">
                <CardHeader>
                  <CardTitle>Cálculo de Dosis Crítica</CardTitle>
                  <CardDescription>Indica los parámetros de la piscina afectada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Volumen del Vaso (m³)</Label>
                      <Input type="number" placeholder="Ej: 250" onChange={(e) => setVolume(parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Producto Pedrosa</Label>
                      <Select onValueChange={setProduct}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(POOL_PRODUCTS.chlorine).map(prod => <SelectItem key={prod} value={prod}>{prod}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700 h-12 font-bold" onClick={handleCalculateEmergency}>
                    CALCULAR TRATAMIENTO DE CHOQUE
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="correction" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={cn("cursor-pointer transition-all border-2", activeCorrection === 'chlorine' ? "border-blue-500 bg-blue-50" : "hover:border-blue-200")}
                onClick={() => { setActiveCorrection('chlorine'); setResult(null); }}
              >
                <CardContent className="p-6 text-center">
                  <Droplets className="w-10 h-10 mx-auto text-blue-600 mb-3" />
                  <h3 className="font-bold">Ajustar Cloro</h3>
                </CardContent>
              </Card>
              <Card 
                className={cn("cursor-pointer transition-all border-2", activeCorrection === 'phUp' ? "border-green-500 bg-green-50" : "hover:border-green-200")}
                onClick={() => { setActiveCorrection('phUp'); setResult(null); }}
              >
                <CardContent className="p-6 text-center">
                  <Plus className="w-10 h-10 mx-auto text-green-600 mb-3" />
                  <h3 className="font-bold">Subir pH</h3>
                </CardContent>
              </Card>
              <Card 
                className={cn("cursor-pointer transition-all border-2", activeCorrection === 'phDown' ? "border-cyan-500 bg-cyan-50" : "hover:border-cyan-200")}
                onClick={() => { setActiveCorrection('phDown'); setResult(null); }}
              >
                <CardContent className="p-6 text-center">
                  <Zap className="w-10 h-10 mx-auto text-cyan-600 mb-3" />
                  <h3 className="font-bold">Bajar pH</h3>
                </CardContent>
              </Card>
            </div>

            {activeCorrection && (
              <Card className="border-none shadow-lg animate-in slide-in-from-top-4">
                <CardHeader>
                  <CardTitle>Ajuste de Parámetros Diarios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Volumen (m³)</Label>
                      <Input type="number" onChange={(e) => setVolume(parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Actual</Label>
                      <Input type="number" step="0.1" onChange={(e) => setCurrentValue(parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Objetivo</Label>
                      <Input type="number" step="0.1" onChange={(e) => setTargetValue(parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Producto</Label>
                      <Select onValueChange={setProduct}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {activeCorrection === 'chlorine' 
                            ? Object.keys(POOL_PRODUCTS.chlorine).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                            : activeCorrection === 'phUp'
                              ? Object.keys(POOL_PRODUCTS.phUp).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                              : Object.keys(POOL_PRODUCTS.phDown).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-primary h-12 font-bold" onClick={handleCalculateCorrection}>
                    CALCULAR DOSIFICACIÓN
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                <CardTitle>Memoria de Actuación Sanitaria</CardTitle>
                <CardDescription className="text-white/60">Parte oficial de incidencias para registro legal.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Piscina Afectada</Label>
                    <Input placeholder="Ej: Piscina Infinity" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha y Hora Detección</Label>
                    <Input type="datetime-local" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descripción de la Incidencia</Label>
                  <Textarea placeholder="Detalla lo ocurrido..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Actuaciones Realizadas</Label>
                  <Textarea placeholder="Cierre, hipercloración, aspirado..." rows={4} />
                </div>
                <Button className="w-full bg-accent hover:bg-accent/90 font-bold h-12 gap-2">
                  <FileText className="w-4 h-4" /> GENERAR DOCUMENTO DE REGISTRO
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="mt-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md overflow-hidden">
                  <div className="h-2 bg-orange-500" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">🟤 Heces Sólidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm font-medium">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Cerrar piscina inmediatamente.</li>
                      <li>Retirar restos con red (NUNCA aspirar).</li>
                      <li>Aislar contaminante en bolsa cerrada.</li>
                      <li>Cloro 2 ppm + pH &lt; 7.5 durante 30 min.</li>
                      <li>Verificar niveles antes de reapertura.</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden">
                  <div className="h-2 bg-red-600" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">💧 Heces Líquidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm font-medium">
                    <ol className="list-decimal list-inside space-y-2 text-red-900">
                      <li>Cierre total inmediato.</li>
                      <li>Elevar cloro libre a 20 ppm manteniendo pH &lt; 7.5.</li>
                      <li>Filtración continua 13 horas.</li>
                      <li>Aspirado de fondo directo al desagüe.</li>
                      <li>Contralavado intensivo de filtros.</li>
                    </ol>
                  </CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-primary text-white rounded-t-lg">
                <CardTitle>Gestión de Pedidos Químicos</CardTitle>
                <CardDescription className="text-white/70">Control de stock para Hoteles Wave & Sky</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-4 text-left font-bold text-xs uppercase tracking-widest">Producto</th>
                        <th className="p-4 text-center font-bold text-xs uppercase tracking-widest text-blue-600">🌊 Hotel Wave</th>
                        <th className="p-4 text-center font-bold text-xs uppercase tracking-widest text-cyan-600">☁️ Hotel Sky</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHEMICAL_PRODUCTS_LIST.map((prod, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm font-medium">{prod}</td>
                          <td className="p-4 text-center bg-blue-50/10">
                            <Input 
                              type="number" 
                              className="w-20 mx-auto text-center font-bold border-blue-200" 
                              placeholder="0"
                              onChange={(e) => handleOrderChange(i, 'wave', e.target.value)}
                            />
                          </td>
                          <td className="p-4 text-center bg-cyan-50/10">
                            <Input 
                              type="number" 
                              className="w-20 mx-auto text-center font-bold border-cyan-200" 
                              placeholder="0"
                              onChange={(e) => handleOrderChange(i, 'sky', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="p-6 bg-slate-50 flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700 gap-2 font-bold px-8" onClick={generateWhatsAppOrder}>
                  <Send className="w-4 h-4" /> ENVIAR POR WHATSAPP
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {result && (
          <div className="animate-in zoom-in-95 duration-300">
            <Card className="border-none shadow-2xl bg-white overflow-hidden">
              <div className={cn("h-3 w-full", result.isEmergency ? "bg-red-600" : "bg-primary")} />
              <CardHeader className="bg-slate-50/50 pb-8 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-black text-primary uppercase">{result.title}</CardTitle>
                    <CardDescription className="font-bold text-slate-500">Memoria Técnica Generada por PrestoApp</CardDescription>
                  </div>
                  <Badge className={cn("mt-1", result.isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>
                    {result.isEmergency ? "ACCIÓN CRÍTICA" : "CORRECCIÓN ESTÁNDAR"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border text-center space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Dosis a Aplicar</p>
                    <p className="text-4xl font-black text-primary">{result.dose} <span className="text-xl">{result.unit}</span></p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border text-center space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Tiempo Tratamiento</p>
                    <p className="text-4xl font-black text-primary"><Clock className="w-6 h-6 inline mb-1 mr-1" /> {result.time}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border text-center space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Producto</p>
                    <p className="text-lg font-black text-primary truncate px-2">{calcProduct}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Protocolo de Actuación Legal
                  </h4>
                  <div className="space-y-3">
                    {result.steps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                        <p className="text-sm font-medium text-slate-700 self-center">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 p-6 flex justify-end gap-2">
                <Button variant="outline" className="gap-2 border-primary text-primary" onClick={exportResultPDF}>
                  <Download className="w-4 h-4" /> EXPORTAR PDF
                </Button>
                <Button variant="ghost" onClick={() => setResult(null)}>Cerrar</Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}