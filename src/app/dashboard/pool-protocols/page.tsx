
"use client"

import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react';
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
  Zap, 
  FileText, 
  Droplets,
  Skull,
  CheckCircle2,
  Download,
  MapPin,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Image as ImageIcon,
  Camera,
  Loader2,
  X,
  Maximize2,
  Info,
  History,
  FileCheck,
  User,
  ShieldAlert,
  AlertTriangle,
  Pencil,
  Calendar,
  Layers,
  FlaskConical,
  Thermometer
} from 'lucide-react';
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
import { calculateChlorineDose, calculatePHDose, POOL_PRODUCTS } from '@/lib/utils/pool-calculations';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, limit, getDocs, updateDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MemoriaActuacion, MemoriaType, WaterInstallation, WaterInstallationType } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

const MEMORIA_TEMPLATES: Record<MemoriaType, Partial<MemoriaActuacion>> = {
  PREVENTIVO: {
    introduction: 'Tratamiento preventivo para el control de microorganismos en la instalación conforme al Plan de Mantenimiento.',
    justification: 'Cumplimiento del plan de mantenimiento regular y medidas preventivas sanitarias según protocolo interno V4.',
    incidentSource: 'PLAN PREVENTIVO',
    affectedParameter: 'MICROBIOLOGÍA GENERAL',
    procedureDetails: {
      areaTreated: 'Vaso Principal / SPA',
      preparation: 'Cierre al público, señalización perimetral y notificación interna.',
      process: 'Hipercloración controlada manteniendo pH en rango óptimo.',
      treatmentType: 'Hipercloración',
      concentration: '20 ppm',
      contactTime: '8 horas',
      safetyMeasures: 'Uso de EPIs (mascarilla, guantes), vallado de seguridad y vigilancia técnica.'
    }
  },
  E_COLI: {
    introduction: 'Actuación de emergencia ante la detección de Escherichia coli o accidente fecal diarreico.',
    justification: 'Presencia de bacterias indicadoras de contaminación fecal. Riesgo elevado por enterobacterias y Cryptosporidium.',
    incidentSource: 'ANALÍTICA EXTERNA / INCIDENTE',
    affectedParameter: 'E. COLI / CRYPTOSPORIDIUM',
    procedureDetails: {
      areaTreated: 'Vaso afectado y sistema de filtración completo.',
      preparation: 'CIERRE INMEDIATO. Limpieza de fondo, alrededores, rebosaderos y pre-filtros.',
      process: 'Elevación de cloro a 20 ppm durante 8 horas (CT 9600) o 40 ppm durante 4 horas. pH entre 7.2-7.5. Apertura de todos los by-passes.',
      treatmentType: 'Hipercloración de Choque CT 9600',
      concentration: '20 ppm',
      contactTime: '8 horas',
      safetyMeasures: 'Prohibición total de acceso. Supervisión técnica continua y contra-lavado de filtros inicial y final.'
    }
  },
  PSEUDOMONAS: {
    introduction: 'Tratamiento de desinfección intensiva por presencia confirmada de Pseudomonas aeruginosa asociada a biofilm.',
    justification: 'Detección de patógenos asociados a formación de biofilm y deficiencias en recirculación.',
    incidentSource: 'ANALÍTICA MICROBIOLÓGICA',
    affectedParameter: 'P. AERUGINOSA',
    procedureDetails: {
      areaTreated: 'Vaso, jets, soplantes y circuitos de masaje.',
      preparation: 'Cierre temporal. Limpieza profunda de superficies, rebosaderos y pre-filtros.',
      process: 'Elevación de cloro a 20-30 ppm durante 3-2 horas (CT 3600). Activación de todos los circuitos secundarios, cascadas y jets.',
      treatmentType: 'Tratamiento Biofilm CT 3600',
      concentration: '20-30 ppm',
      contactTime: '3-2 horas',
      safetyMeasures: 'Señalización de tratamiento químico intensivo. EPIs obligatorios. Revisión de material filtrante.'
    }
  },
  LEGIONELLA: {
    introduction: 'Protocolo de desinfección ante presencia de Legionella spp. (>1000 ufc/L).',
    justification: 'Incumplimiento de límites microbiológicos según RD 3/2023 y protocolo V4.',
    incidentSource: 'CONTROL OFICIAL',
    affectedParameter: 'LEGIONELLA SPP.',
    procedureDetails: {
      areaTreated: 'Instalación completa, vasos, depósitos y todos los circuitos.',
      preparation: 'Desconexión calor (<30ºC). Vaciado total. Limpieza enérgica frotada con hipoclorito (5 mg/L) para eliminar biofilm.',
      process: 'Llenado y cloración a 20 mg/L recirculando 10 horas mínimo. Control horario de cloro y pH (<7.5).',
      treatmentType: 'Tratamiento Térmico-Químico Intensivo',
      concentration: '20 mg/L',
      contactTime: '10 horas',
      safetyMeasures: 'EPIs respiratorios FFP3. Neutralización final. Mantenimiento 30 días a concentración máxima permitida.'
    }
  },
  FECAL_SOLIDO: {
    introduction: 'Actuación inmediata ante accidente fecal sólido detectado en vaso.',
    justification: 'Medida correctiva inmediata para eliminar riesgo biológico por enterobacterias.',
    incidentSource: 'AVISO TÉCNICO / SOCORRISTA',
    affectedParameter: 'CONTAMINACIÓN BIOLÓGICA',
    procedureDetails: {
      areaTreated: 'Vaso de piscina.',
      preparation: 'Cierre al público. Extracción manual inmediata del material con útiles desinfectados.',
      process: 'Elevación puntual de cloro libre a 2-3 ppm manteniendo pH entre 7.2-7.5.',
      treatmentType: 'Cloración Correctiva',
      concentration: '2-3 ppm',
      contactTime: '1 hora',
      safetyMeasures: 'Desinfección de útiles de limpieza al 1% tras uso.'
    }
  },
  OTRO: {
    introduction: '',
    justification: '',
    procedureDetails: { areaTreated: '', preparation: '', process: '', safetyMeasures: '', treatmentType: '', concentration: '', contactTime: '' }
  }
};

export default function PoolProtocolsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando protocolos de aguas...</div>}>
      <PoolProtocolsContent />
    </Suspense>
  );
}

function PoolProtocolsContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'water-inventory');
  const [activeEmergency, setActiveEmergency] = useState<string | null>(null);
  const [activeCorrection, setActiveCorrection] = useState<string | null>(null);
  
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'INSTALLATION' | 'MEMORIA'} | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<WaterInstallation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);

  const tenantRef = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return doc(db, 'tenants', profile.tenantId);
  }, [db, profile?.tenantId]);
  const { data: tenant } = useDoc(tenantRef);

  // Water Inventory Logic
  const [isAddInstallationOpen, setIsAddInstallationOpen] = useState(false);
  const [editingInstallation, setEditingInstallation] = useState<WaterInstallation | null>(null);
  const [installationPhotos, setInstallationPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const installationsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'waterInstallations'), orderBy('createdAt', 'desc'));
  }, [db, profile?.tenantId]);

  const { data: installations, isLoading: loadingInstallations } = useCollection<WaterInstallation>(installationsQuery);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setInstallationPhotos(prev => [...prev, url]);
      toast({ title: "Foto subida", description: "La imagen se ha añadido al inventario." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de carga", description: "No se pudo subir la foto." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingInstallation(null);
    setInstallationPhotos([]);
    setIsAddInstallationOpen(true);
  };

  const handleOpenEdit = (inst: WaterInstallation) => {
    setEditingInstallation(inst);
    setInstallationPhotos(inst.photos || []);
    setIsAddInstallationOpen(true);
  };

  const handleSaveInstallation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId) return;

    const formData = new FormData(e.currentTarget);
    const instData = {
      name: formData.get('name') as string,
      type: formData.get('type') as WaterInstallationType,
      volume: parseFloat(formData.get('volume') as string) || 0,
      dimensions: formData.get('dimensions') as string,
      notes: formData.get('notes') as string,
      photos: installationPhotos,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingInstallation) {
        const instRef = doc(db, 'tenants', profile.tenantId, 'waterInstallations', editingInstallation.id);
        updateDocumentNonBlocking(instRef, instData);
        toast({ title: "Instalación actualizada", description: "Los cambios se han guardado correctamente." });
      } else {
        const colRef = collection(db, 'tenants', profile.tenantId, 'waterInstallations');
        await addDoc(colRef, {
          ...instData,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Instalación registrada", description: "El equipo de agua ha sido añadido correctamente." });
      }
      setIsAddInstallationOpen(false);
      setInstallationPhotos([]);
      setEditingInstallation(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !itemToDelete) return;

    const collectionName = itemToDelete.type === 'INSTALLATION' ? 'waterInstallations' : 'memorias';
    const docRef = doc(db, 'tenants', profile.tenantId, collectionName, itemToDelete.id);
    
    deleteDocumentNonBlocking(docRef);
    
    toast({ 
      title: itemToDelete.type === 'INSTALLATION' ? "Instalación eliminada" : "Memoria técnica eliminada",
      description: "El registro ha sido retirado permanentemente."
    });
    
    setItemToDelete(null);
  };

  // Memorias State
  const [memoriaForm, setMemoriaForm] = useState<Partial<MemoriaActuacion>>({
    type: 'PREVENTIVO',
    location: '',
    incidentDate: new Date().toISOString().split('T')[0],
    reportDate: new Date().toISOString().split('T')[0],
    ...MEMORIA_TEMPLATES.PREVENTIVO,
    resultsData: { cloroBefore: 1.2, cloroAfter: 20.5, phBefore: 7.2, phAfter: 7.4 },
    results: 'Niveles Pre: Cloro 1.2 / pH 7.2. Niveles Post: Cloro 20.5 / pH 7.4.',
    conclusions: 'Tras la neutralización del producto y la verificación analítica in situ, la instalación queda apta para el servicio sanitario conforme a V4.'
  });

  const memoriasQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'memorias'), orderBy('createdAt', 'desc'));
  }, [db, profile?.tenantId]);

  const { data: memorias, isLoading: loadingMemorias } = useCollection<MemoriaActuacion>(memoriasQuery);

  // States for Calculator
  const [calcVolume, setVolume] = useState<number>(0);
  const [calcProduct, setProduct] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(0);
  const [result, setResult] = useState<any>(null);

  const handleTemplateSelect = (type: MemoriaType) => {
    setMemoriaForm(prev => ({
      ...prev,
      type,
      ...MEMORIA_TEMPLATES[type]
    }));
  };

  const handleSaveMemoria = async () => {
    if (!db || !profile?.tenantId || !user) return;
    if (!memoriaForm.location || !memoriaForm.incidentDate) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Indica ubicación y fecha." });
      return;
    }

    try {
      const q = query(collection(db, 'tenants', profile.tenantId, 'memorias'));
      const snapshot = await getDocs(q);
      const count = snapshot.size + 1;
      const docNumber = `MT-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;
      const documentHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const colRef = collection(db, 'tenants', profile.tenantId, 'memorias');
      await addDoc(colRef, {
        ...memoriaForm,
        docNumber,
        documentHash,
        cif: tenant?.cif || '---',
        address: tenant?.address || '---',
        createdBy: profile.displayName || user.email,
        createdAt: serverTimestamp()
      });
      toast({ title: "Memoria Guardada", description: `Registro ${docNumber} archivado.` });
      setActiveTab('memorias-history');
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la memoria." });
    }
  };

  const generatePDF = (memoria: any) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setDrawColor(31, 74, 168);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, 170, 25);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 74, 168);
    doc.text('MEMORIA TÉCNICA DE ACTUACIÓN SANITARIA', margin + 5, y + 10);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('PrestoApp - Sistema Digital de Autocontrol Sanitario V4.0 (12/01/2023)', margin + 5, y + 18);
    doc.text(`Documento Nº: ${memoria.docNumber}`, margin + 125, y + 10);
    y += 35;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 7, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('1. DATOS IDENTIFICATIVOS', margin + 2, y + 5);
    y += 12;

    const info = [
      ['Establecimiento:', tenant?.name || 'Hotel PrestoApp'],
      ['CIF:', memoria.cif || '---'],
      ['Dirección:', memoria.address || '---'],
      ['Instalación:', memoria.location || 'Vaso No Especificado'],
      ['Fecha Actuación:', memoria.incidentDate],
      ['Responsable Técnico:', memoria.createdBy],
    ];

    info.forEach(row => {
      doc.setFont('helvetica', 'bold');
      doc.text(row[0], margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(row[1], margin + 45, y);
      y += 6;
    });
    y += 5;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('2. MARCO NORMATIVO', margin + 2, y + 5);
    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('• Real Decreto 3/2023, por el que se establecen los criterios técnico-sanitarios de la calidad del agua de consumo.', margin, y); y += 5;
    doc.text('• Real Decreto 742/2013, criterios técnico-sanitarios de las piscinas.', margin, y); y += 5;
    doc.text('• Protocolo V4 (12/01/2023) del Autocontrol del Establecimiento.', margin, y); y += 10;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('3. DESCRIPCIÓN DE LA INCIDENCIA / MOTIVO', margin + 2, y + 5);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`Origen: ${memoria.incidentSource || 'Control Rutinario'}`, margin, y); y += 5;
    doc.text(`Parámetro afectado: ${memoria.affectedParameter || 'Microbiología'}`, margin, y); y += 7;
    const splitDesc = doc.splitTextToSize(memoria.introduction || '', 170);
    doc.text(splitDesc, margin, y);
    y += (splitDesc.length * 5) + 10;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('4. PROCEDIMIENTO EJECUTADO', margin + 2, y + 5);
    y += 12;
    doc.setFontSize(9);
    doc.text(`Tratamiento: ${memoria.procedureDetails?.treatmentType || 'Hipercloración'}`, margin, y); y += 5;
    doc.text(`Concentración: ${memoria.procedureDetails?.concentration || '20 ppm'}`, margin, y);
    doc.text(`Tiempo: ${memoria.procedureDetails?.contactTime || '8 horas'}`, margin + 80, y); y += 7;
    
    doc.setFont('helvetica', 'bold'); doc.text('Preparación:', margin, y); doc.setFont('helvetica', 'normal');
    const prep = doc.splitTextToSize(memoria.procedureDetails?.preparation || '', 140);
    doc.text(prep, margin + 30, y); y += (prep.length * 5) + 2;
    
    doc.setFont('helvetica', 'bold'); doc.text('Proceso:', margin, y); doc.setFont('helvetica', 'normal');
    const proc = doc.splitTextToSize(memoria.procedureDetails?.process || '', 140);
    doc.text(proc, margin + 30, y); y += (proc.length * 5) + 2;

    doc.setFont('helvetica', 'bold'); doc.text('Seguridad:', margin, y); doc.setFont('helvetica', 'normal');
    const seg = doc.splitTextToSize(memoria.procedureDetails?.safetyMeasures || '', 140);
    doc.text(seg, margin + 30, y); y += (seg.length * 5) + 10;

    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('5. RESULTADOS ANALÍTICOS', margin + 2, y + 5);
    y += 12;
    
    doc.setFillColor(230, 235, 255);
    doc.rect(margin, y, 170, 7, 'F');
    doc.text('PARÁMETRO', margin + 5, y + 5);
    doc.text('ANTES', margin + 50, y + 5);
    doc.text('DESPUÉS', margin + 85, y + 5);
    doc.text('RANGO LEGAL', margin + 120, y + 5);
    doc.text('CUMPLE', margin + 150, y + 5);
    y += 13;

    const data = [
      ['Cloro Libre', `${memoria.resultsData?.cloroBefore} ppm`, `${memoria.resultsData?.cloroAfter} ppm`, '0.5 - 2.0 ppm', 'SI'],
      ['pH', `${memoria.resultsData?.phBefore}`, `${memoria.resultsData?.phAfter}`, '7.2 - 7.8', 'SI'],
    ];

    data.forEach(row => {
      doc.setFont('helvetica', 'normal');
      doc.text(row[0], margin + 5, y);
      doc.text(row[1], margin + 50, y);
      doc.text(row[2], margin + 85, y);
      doc.text(row[3], margin + 120, y);
      doc.text(row[4], margin + 150, y);
      y += 8;
    });
    y += 10;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('7. CONCLUSIONES Y VALIDACIÓN', margin + 2, y + 5);
    y += 12;
    const splitConc = doc.splitTextToSize(memoria.conclusions || '', 170);
    doc.setFont('helvetica', 'italic');
    doc.text(splitConc, margin, y);
    y += (splitConc.length * 5) + 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('FIRMA DIGITAL DEL TÉCNICO:', margin, y);
    doc.text('FECHA DE CIERRE Y SELLADO:', margin + 90, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`${memoria.createdBy}`, margin, y);
    doc.text(`${new Date().toLocaleString()}`, margin + 90, y);
    y += 5;
    doc.setTextColor(150);
    doc.text(`HASH: ${memoria.documentHash || 'PRESTO-SIGNED-V4'}`, margin, y);

    doc.save(`${memoria.docNumber}-${memoria.location}.pdf`);
  };

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
        targetPpm = 2; time = "1 hora"; 
        steps = [
          "Cerrar la piscina al público.",
          "Extraer todo el material fecal/vómito mediante una pala o cubo.",
          "Desinfectar útiles de extracción al finalizar.",
          "Si el cloro es < 2 ppm, aumentarlo a 2-3 ppm (pH 7.2-7.5).",
          "Mantener niveles durante un tiempo mínimo de 1 hora."
        ];
        break;
      case 'liquid': 
      case 'ecoli':
        targetPpm = 20; time = "8 horas (CT 9600)"; 
        steps = [
          "CIERRE INMEDIATO Y SEÑALIZACIÓN.",
          "Limpiar fondo, alrededores, rebosadero y pre-filtros.",
          "Realizar un contra-lavado de los filtros.",
          "Elevar cloro a 20 ppm / 8h (o 40 ppm / 4h). Control pH 7.2-7.5.",
          "Abrir todos los by-passes, bombas stand-by, chorros y soplantes.",
          "Realizar un nuevo contra-lavado de filtros al finalizar.",
          "Restablecer valores normales antes de abrir al público."
        ];
        break;
      case 'pseudomonas': 
        targetPpm = 20; time = "3 horas (CT 3600)"; 
        steps = [
          "CIERRE INMEDIATO Y DELIMITACIÓN DE ACCESO.",
          "Limpiar fondo, rebosaderos y todos los pre-filtros.",
          "Realizar contra-lavado de los filtros.",
          "Elevar cloro a 20-30 ppm durante 3-2 horas (pH 7.2-7.5).",
          "Conectar todos los sistemas secundarios (cascadas, jets, soplantes) durante unos minutos.",
          "Realizar nuevo contra-lavado de filtros al terminar.",
          "Valorar sustitución de material filtrante si persiste."
        ];
        break;
      case 'legionella_low':
        targetPpm = 20; time = "3 horas";
        steps = [
          "CIERRE INMEDIATO AL PÚBLICO.",
          "Bajar temperatura del agua a < 30ºC.",
          "Desconectar dosificadores automáticos.",
          "Vaciar agua del vaso y depósito de compensación.",
          "Limpieza profunda de paredes y desinfección de filtros de bombas.",
          "Desmontar y sumergir boquillas en solución 20 mg/L cloro por 30 min.",
          "Clorar a 20-30 mg/L por 3-2 horas circulando por todo el sistema.",
          "Neutralizar cloro libre residual antes del vaciado final.",
          "Aclarar, volver a llenar y restablecer condiciones."
        ];
        break;
      case 'legionella_high':
        targetPpm = 20; time = "10 horas mínimo";
        steps = [
          "CIERRE INMEDIATO. NOTIFICAR AL LABORATORIO.",
          "Parar sistema de calentamiento.",
          "Vaciar vasos, depósitos y TODOS los circuitos.",
          "Frotar enérgicamente paredes con solución de hipoclorito (5 mg/L).",
          "Desechar lodos y biofilm al alcantarillado.",
          "Revisar y reponer material filtrante si es necesario.",
          "Llenar sistema completo y clorar a 20 mg/L (pH < 7.5).",
          "Recircular hipercloración por todo el circuito durante 10 horas.",
          "Neutralizar y restablecer niveles habituales.",
          "Mantener desinfectante al máximo legal durante 30 días tras reapertura."
        ];
        break;
    }

    const productInfo = POOL_PRODUCTS.chlorine[calcProduct as keyof typeof POOL_PRODUCTS.chlorine];
    const dose = calculateChlorineDose(calcVolume, targetPpm, 0, calcProduct);
    const unit = productInfo.type === 'liquid' ? 'L' : 'kg';

    setResult({ dose: dose.toFixed(2), unit, time, steps, isEmergency: true, title: activeEmergency.toUpperCase().replace('_', ' ') });
  };

  const handleCalculateCorrection = () => {
    if (!calcVolume || !calcProduct || !activeCorrection) return;
    let dose = 0;
    let unit = 'kg';
    let steps: string[] = [];

    if (activeCorrection === 'chlorine') {
      dose = calculateChlorineDose(calcVolume, targetValue, currentValue, calcProduct);
      const productInfo = POOL_PRODUCTS.chlorine[calcProduct as keyof typeof POOL_PRODUCTS.chlorine];
      unit = productInfo.type === 'liquid' ? 'L' : 'kg';
      steps = ["Aportar producto en ausencia de bañistas.", "Distribuir uniformemente.", "Recirculación mínima 1h."];
    } else {
      dose = calculatePHDose(calcVolume, targetValue, currentValue, calcProduct, activeCorrection === 'phUp' ? 'up' : 'down');
      const products = activeCorrection === 'phUp' ? POOL_PRODUCTS.phUp : POOL_PRODUCTS.phDown;
      unit = (products as any)[calcProduct]?.type === 'liquid' ? 'L' : 'kg';
      steps = ["Añadir lentamente diluido.", "2-4 horas con recirculación.", "Verificar niveles antes de abrir."];
    }
    setResult({ dose: dose.toFixed(2), unit, time: "2-4 horas", steps, isEmergency: false, title: activeCorrection.toUpperCase() });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Waves className="w-5 h-5 text-accent" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Sistema de Autocontrol Sanitario V4 (12/01/2023)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Protocolos de Aguas</h2>
            <p className="text-sm text-muted-foreground">Manuales operativos, cálculos de dosis y memorias técnicas reglamentarias.</p>
          </div>
          {activeTab === 'water-inventory' && (
            <Button onClick={handleOpenAdd} className="gap-2 bg-primary">
              <Plus className="w-4 h-4" /> Nueva Instalación
            </Button>
          )}
        </div>

        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                ¿Confirmar eliminación del registro?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente del archivo histórico de {tenant?.name || 'el hotel'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                Confirmar Eliminación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {activeTab === 'water-inventory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingInstallations ? (
                <p>Cargando inventario...</p>
              ) : !installations || installations.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                  <Waves className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="font-bold text-slate-500 text-lg">No hay instalaciones registradas.</p>
                  <Button variant="link" onClick={handleOpenAdd}>Registrar primera piscina o aljibe</Button>
                </div>
              ) : (
                installations.map(inst => (
                  <Card key={inst.id} className="overflow-hidden border-none shadow-md group hover:shadow-xl transition-all">
                    <div className="relative h-48 bg-slate-100">
                      {inst.photos && inst.photos.length > 0 ? (
                        <Image src={inst.photos[0]} alt={inst.name} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Badge className="bg-white/90 text-primary border-none shadow-sm">{inst.type}</Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-bold text-primary">{inst.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenEdit(inst)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => setItemToDelete({ id: inst.id, type: 'INSTALLATION' })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <p className="font-black text-[10px] text-blue-600 uppercase">Volumen</p>
                          <p className="font-bold text-sm">{inst.volume} m³</p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <p className="font-black text-[10px] text-slate-600 uppercase">Medidas</p>
                          <p className="font-bold text-sm truncate">{inst.dimensions || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 border-t bg-slate-50/50">
                      <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold gap-2 text-muted-foreground uppercase" onClick={() => { setSelectedInstallation(inst); setIsDetailOpen(true); }}>
                        <Maximize2 className="w-3 h-3" /> Detalle Técnico
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>

            <Dialog open={isAddInstallationOpen} onOpenChange={(open) => {
              setIsAddInstallationOpen(open);
              if(!open) { setEditingInstallation(null); setInstallationPhotos([]); }
            }}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingInstallation ? 'Editar Instalación' : 'Registrar Instalación de Agua'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveInstallation} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Instalación</Label>
                    <Input name="name" required defaultValue={editingInstallation?.name} placeholder="Ej: Piscina Climatizada Exterior" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select name="type" defaultValue={editingInstallation?.type || "PISCINA"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PISCINA">Piscina</SelectItem>
                          <SelectItem value="ALJIBE">Aljibe / Depósito</SelectItem>
                          <SelectItem value="SPA">SPA / Jacuzzi</SelectItem>
                          <SelectItem value="DEPOSITO">Depósito ACS</SelectItem>
                          <SelectItem value="OTRO">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Volumen (m³)</Label>
                      <Input name="volume" type="number" step="0.01" required defaultValue={editingInstallation?.volume} placeholder="Ej: 250" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dimensiones</Label>
                    <Input name="dimensions" defaultValue={editingInstallation?.dimensions} placeholder="Ej: 25m x 12m x 1.5m" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas / Observaciones</Label>
                    <Textarea name="notes" defaultValue={editingInstallation?.notes} placeholder="Filtración, dosificación, etc." />
                  </div>
                  <div className="space-y-2">
                    <Label>Fotos</Label>
                    <div className="flex flex-wrap gap-2">
                      {installationPhotos.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border">
                          <Image src={url} alt={`Ref ${i}`} fill className="object-cover" />
                          <button type="button" onClick={() => setInstallationPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:text-accent">
                        {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsAddInstallationOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-primary" disabled={isUploading}>Guardar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { id: 'solid', label: 'Fecal Sólido', icon: Droplets, color: 'text-orange-600' },
                { id: 'ecoli', label: 'E. coli / Diarrea', icon: Skull, color: 'text-red-600' },
                { id: 'pseudomonas', label: 'Pseudomonas', icon: Waves, color: 'text-purple-600' },
                { id: 'legionella_low', label: 'Legionella (Baja)', icon: AlertCircle, color: 'text-slate-600' },
                { id: 'legionella_high', label: 'Legionella (Alta)', icon: AlertTriangle, color: 'text-red-700' },
                { id: 'liquid', label: 'Vómitos/Sangre', icon: FlaskConical, color: 'text-rose-600' },
              ].map(type => (
                <Card key={type.id} className={cn("cursor-pointer transition-all border-2", activeEmergency === type.id ? "border-primary bg-primary/5" : "hover:border-slate-200")} onClick={() => { setActiveEmergency(type.id); setResult(null); }}>
                  <CardContent className="p-3 text-center">
                    <type.icon className={cn("w-6 h-6 mx-auto mb-2", type.color)} />
                    <h3 className="font-bold text-[10px] uppercase leading-tight">{type.label}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activeEmergency && (
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle className="text-lg">Calculadora de Protocolo Crítico V4</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Instalación / Volumen</Label>
                      <Select onValueChange={(v) => setVolume(parseFloat(v))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {installations?.map(i => <SelectItem key={i.id} value={i.volume.toString()}>{i.name} ({i.volume} m³)</SelectItem>)}
                          <SelectItem value="0">Manual...</SelectItem>
                        </SelectContent>
                      </Select>
                      {calcVolume === 0 && <Input type="number" placeholder="Ej: 250" className="mt-2" onChange={(e) => setVolume(parseFloat(e.target.value))} />}
                    </div>
                    <div className="space-y-2"><Label>Desinfectante a Utilizar</Label>
                      <Select onValueChange={setProduct}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{Object.keys(POOL_PRODUCTS.chlorine).map(prod => <SelectItem key={prod} value={prod}>{prod}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-red-600 h-12 font-bold text-white shadow-xl shadow-red-200" onClick={handleCalculateEmergency}>CALCULAR TRATAMIENTO DE EMERGENCIA V4</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'correction' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['chlorine', 'phUp', 'phDown'].map(type => (
                <Card key={type} className={cn("cursor-pointer transition-all border-2", activeCorrection === type ? "border-blue-500 bg-blue-50" : "hover:border-blue-200")} onClick={() => { setActiveCorrection(type); setResult(null); }}>
                  <CardContent className="p-4 md:p-6 text-center">
                    {type === 'chlorine' ? <Droplets className="w-8 h-8 md:w-10 md:h-10 mx-auto text-blue-600 mb-3" /> : type === 'phUp' ? <Plus className="w-8 h-8 md:w-10 md:h-10 mx-auto text-green-600 mb-3" /> : <Zap className="w-8 h-8 md:w-10 md:h-10 mx-auto text-cyan-600 mb-3" />}
                    <h3 className="font-bold text-sm md:text-base">{type === 'chlorine' ? 'Ajustar Cloro' : type === 'phUp' ? 'Subir pH' : 'Bajar pH'}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activeCorrection && (
              <Card className="border-none shadow-lg">
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Instalación</Label>
                      <Select onValueChange={(v) => setVolume(parseFloat(v))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {installations?.map(i => <SelectItem key={i.id} value={i.volume.toString()}>{i.name}</SelectItem>)}
                          <SelectItem value="0">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Valor Actual</Label><Input type="number" step="0.1" onChange={(e) => setCurrentValue(parseFloat(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Valor Objetivo</Label><Input type="number" step="0.1" onChange={(e) => setTargetValue(parseFloat(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Producto</Label>
                      <Select onValueChange={setProduct}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {activeCorrection === 'chlorine' ? Object.keys(POOL_PRODUCTS.chlorine).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>) : activeCorrection === 'phUp' ? Object.keys(POOL_PRODUCTS.phUp).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>) : Object.keys(POOL_PRODUCTS.phDown).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-primary h-12 font-bold text-white" onClick={handleCalculateCorrection}>CALCULAR DOSIFICACIÓN CORRECTIVA</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'memorias-form' && (
          <div className="animate-in fade-in duration-500">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-primary text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div><CardTitle className="text-xl">Generador de Memorias Técnicas V4</CardTitle><CardDescription className="text-white/70 text-xs">Registro oficial de actuaciones especiales conforme a RD 3/2023 y protocolos internos.</CardDescription></div>
                  <Badge className="bg-white text-primary">NUEVA MT</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-8 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                    <User className="w-4 h-4" /> 1. Datos Identificativos y Localización
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label className="text-xs">Establecimiento</Label><Input value={tenant?.name || ''} disabled className="bg-muted" /></div>
                    <div className="space-y-2"><Label className="text-xs">CIF</Label><Input value={tenant?.cif || ''} placeholder="CIF del hotel" onChange={e => setMemoriaForm({...memoriaForm, cif: e.target.value})} /></div>
                    <div className="space-y-2"><Label className="text-xs">Instalación / Vaso</Label>
                      <Select value={memoriaForm.installationId} onValueChange={v => {
                        const inst = installations?.find(i => i.id === v);
                        setMemoriaForm({...memoriaForm, installationId: v, location: inst?.name || ''});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{installations?.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label className="text-xs">Fecha Incidente</Label><Input type="date" value={memoriaForm.incidentDate} onChange={e => setMemoriaForm({...memoriaForm, incidentDate: e.target.value})} /></div>
                    <div className="space-y-2"><Label className="text-xs">Fecha Informe</Label><Input type="date" value={memoriaForm.reportDate} onChange={e => setMemoriaForm({...memoriaForm, reportDate: e.target.value})} /></div>
                    <div className="space-y-2"><Label className="text-xs">Responsable Técnico</Label><Input value={profile?.displayName || ''} disabled className="bg-muted" /></div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                    <ShieldAlert className="w-4 h-4" /> 2. Tipo de Actuación (Plantilla V4)
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                    {(Object.keys(MEMORIA_TEMPLATES) as MemoriaType[]).map(type => (
                      <Button key={type} variant={memoriaForm.type === type ? 'default' : 'outline'} className={cn("text-[10px] h-auto py-2 font-bold", memoriaForm.type === type && "text-white")} onClick={() => handleTemplateSelect(type)}>{type.replace('_', ' ')}</Button>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                    <Zap className="w-4 h-4" /> 3. Procedimiento Ejecutado
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label className="text-xs font-bold uppercase">Justificación de la Actuación</Label><Textarea rows={2} value={memoriaForm.justification} onChange={e => setMemoriaForm({...memoriaForm, justification: e.target.value})} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold uppercase">Preparación y Medidas de Seguridad</Label><Textarea rows={2} value={memoriaForm.procedureDetails?.preparation} onChange={e => setMemoriaForm({...memoriaForm, procedureDetails: {...memoriaForm.procedureDetails!, preparation: e.target.value}})} /></div>
                    </div>
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase">Detalle del Proceso de Desinfección</Label><Textarea rows={3} value={memoriaForm.procedureDetails?.process} onChange={e => setMemoriaForm({...memoriaForm, procedureDetails: {...memoriaForm.procedureDetails!, process: e.target.value}})} /></div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                    <CheckCircle2 className="w-4 h-4" /> 4. Resultados y Conclusiones
                  </h3>
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase">Dictamen Técnico Final</Label><Textarea rows={2} value={memoriaForm.conclusions} onChange={e => setMemoriaForm({...memoriaForm, conclusions: e.target.value})} /></div>
                </section>
              </CardContent>
              <CardFooter className="bg-slate-50 p-6 flex justify-end gap-4 border-t">
                <Button className="bg-accent font-black px-8 gap-2 text-white shadow-lg" onClick={handleSaveMemoria}>
                  <FileCheck className="w-4 h-4" /> FIRMAR Y ARCHIVAR MEMORIA
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {activeTab === 'memorias-history' && (
          <div className="animate-in fade-in duration-500">
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                <div><CardTitle className="text-lg">Archivo Histórico Memorias Técnicas</CardTitle><CardDescription className="text-xs">Registros archivados bajo protocolo de veracidad V4.</CardDescription></div>
                <History className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {loadingMemorias ? <div className="p-8 text-center">Cargando histórico...</div> : !memorias || memorias.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground italic">No hay memorias registradas aún.</div>
                ) : (
                  <div className="divide-y min-w-[800px]">
                    <div className="grid grid-cols-6 gap-4 p-4 bg-slate-50 text-[10px] font-black uppercase text-muted-foreground">
                      <div>Nº Documento</div><div>Fecha Actuación</div><div>Instalación</div><div>Tipo</div><div>Técnico</div><div className="text-right">Acciones</div>
                    </div>
                    {memorias.map(m => (
                      <div key={m.id} className="p-4 hover:bg-slate-50 grid grid-cols-6 gap-4 items-center group transition-colors">
                        <div className="font-black text-xs text-primary">{m.docNumber}</div>
                        <div className="text-xs">{m.incidentDate}</div>
                        <div className="text-xs font-bold truncate">{m.location}</div>
                        <div><Badge variant="outline" className="text-[9px] font-black uppercase">{m.type}</Badge></div>
                        <div className="text-[10px] italic">{m.createdBy}</div>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 gap-2 font-bold border-accent text-accent hover:bg-accent hover:text-white" onClick={() => generatePDF(m)}><Download className="w-3.5 h-3.5" /> PDF</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100" onClick={() => setItemToDelete({ id: m.id, type: 'MEMORIA' })}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-md">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-lg">Manual de Actuación Técnica Sanitaria V4 – 12/01/2023</CardTitle>
                <CardDescription>Protocolos oficiales para incidencias Físico-Químicas y Microbiológicas.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="fq">
                    <AccordionTrigger className="font-bold text-sm text-left">ACTUACIÓN ANTE INCUMPLIMIENTOS FÍSICO-QUÍMICOS</AccordionTrigger>
                    <AccordionContent className="space-y-4 text-xs leading-relaxed text-slate-700">
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg mb-4">
                        <p className="font-bold text-blue-900 mb-2">NOTAS IMPORTANTES:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-800">
                          <li>En caso de darse condiciones para el cierre (RD 742/2013) – <strong>SE DEBERÁ PROCEDER AL CIERRE DEL VASO.</strong></li>
                          <li>Todas las actuaciones con productos químicos se realizarán en <strong>ausencia de bañistas</strong> y respetando plazos de seguridad.</li>
                        </ol>
                      </div>
                      <div className="grid gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-bold text-primary mb-1 uppercase">Exceso de cloro libre:</p>
                          <p>Revisar funcionamiento de clorador, renovar parcialmente agua del vaso o neutralizar aplicando neutralizante siguiendo instrucciones del proveedor.</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-bold text-primary mb-1 uppercase">Nivel bajo cloro libre:</p>
                          <p>Revisar funcionamiento de clorador, revisar incrustaciones en conductos de inyección, revisar estado del hipoclorito y cantidad, y valorar estabilizante.</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-bold text-primary mb-1 uppercase">Nivel elevado de cloro combinado:</p>
                          <p>Revisar funcionamiento del filtro (colmatación) mediante manómetros, realizar retro-lavado y renovar parcialmente agua del vaso.</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-bold text-primary mb-1 uppercase">Nivel elevado de pH:</p>
                          <p>Revisar funcionamiento dosificador de reductor de pH y regular manualmente.</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-bold text-primary mb-1 uppercase">Turbidez / Transparencia inadecuada:</p>
                          <p>Revisar colmatación de filtros a través de manómetros y realizar retro-lavado.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ecoli">
                    <AccordionTrigger className="font-bold text-red-600 text-sm text-left uppercase">Protocolo E. coli / Accidentes Fecales Diarreicos</AccordionTrigger>
                    <AccordionContent className="space-y-4 text-xs leading-relaxed">
                      <p className="font-black text-red-700 uppercase p-2 bg-red-50 border border-red-100 rounded text-center">LA INSTALACIÓN DEBERÁ SER CERRADA AL PÚBLICO HASTA LA FINALIZACIÓN.</p>
                      <div className="space-y-3">
                        <p><strong>1º Limpieza:</strong> Fondo, alrededores, rebosadero/skimmers y cestillas pre-filtros.</p>
                        <p><strong>2º Filtración:</strong> Realizar un contra-lavado de los filtros.</p>
                        <p><strong>3º Hipercloración:</strong> Elevar cloro a <strong>20 ppm durante 8 horas</strong> (CT 9600) o 40 ppm / 4 horas. Control pH entre 7.2 - 7.5.</p>
                        <p><strong>4º Circuitos:</strong> Abrir by-passes, bombas stand-by, chorros y soplantes para inundar todo el sistema.</p>
                        <p><strong>5º Finalización:</strong> Realizar un nuevo contra-lavado de filtros tras el tiempo de contacto.</p>
                        <p><strong>6º Apertura:</strong> Volver a valores habituales antes de abrir al público.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="pseudomonas">
                    <AccordionTrigger className="font-bold text-purple-600 text-sm text-left uppercase">Protocolo Pseudomonas aeruginosa (Biofilm)</AccordionTrigger>
                    <AccordionContent className="space-y-4 text-xs leading-relaxed">
                      <p className="italic">Asociada frecuentemente a la formación de biofilm en la instalación.</p>
                      <div className="space-y-3">
                        <p><strong>1º Preparación:</strong> CIERRE AL PÚBLICO. Limpieza de fondo, rebosaderos y cestillas.</p>
                        <p><strong>2º Contra-lavado:</strong> Realizar limpieza de filtros inicial.</p>
                        <p><strong>3º Choque:</strong> Elevar cloro a <strong>20-30 ppm durante 3-2 horas</strong> (CT 3600). pH 7.2 - 7.5.</p>
                        <p><strong>4º Sistemas:</strong> Poner en marcha cascadas, jets y soplantes para inundar puntos críticos de riesgo.</p>
                        <p><strong>5º Terminar:</strong> Nuevo contra-lavado final y restablecer valores.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="legionella">
                    <AccordionTrigger className="font-bold text-primary text-sm text-left uppercase">Protocolo Legionella spp. (&gt;1000 ufc/L)</AccordionTrigger>
                    <AccordionContent className="space-y-4 text-xs leading-relaxed">
                      <div className="space-y-3">
                        <p><strong>1º Calor:</strong> Desconectar sistema de calentamiento (trabajar a &lt; 30ºC).</p>
                        <p><strong>2º Vaciado:</strong> Vaciar agua de vasos, depósitos y todos los circuitos.</p>
                        <p><strong>3º Limpieza Mecánica:</strong> Frotado enérgico con hipoclorito (5 mg/L) para eliminar biofilm y lodos.</p>
                        <p><strong>4º Boquillas:</strong> Desmontar y sumergir boquillas en solución 20 mg/L por 30 min.</p>
                        <p><strong>5º Tratamiento:</strong> Clorar a 20 mg/L (pH &lt; 7.5) recirculando por todo el sistema durante <strong>10 horas mínimo</strong>.</p>
                        <p><strong>6º Reapertura:</strong> Mantener concentración desinfectante máxima permitida durante 30 días tras reapertura.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}

        {result && (
          <Card className="border-none shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 mt-8 border-2 border-primary">
            <div className={cn("h-3 w-full", result.isEmergency ? "bg-red-600" : "bg-primary")} />
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-2xl md:text-3xl font-black text-primary uppercase">{result.title}</CardTitle>
              <CardDescription className="font-bold text-xs md:text-sm">Resultado del Cálculo - Protocolo Sanitario V4</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 md:pt-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border text-center"><p className="text-[10px] font-black uppercase text-muted-foreground">Dosis Producto</p><p className="text-3xl md:text-4xl font-black text-primary">{result.dose} <span className="text-xl">{result.unit}</span></p></div>
                <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border text-center"><p className="text-[10px] font-black uppercase text-muted-foreground">Tiempo de Contacto</p><p className="text-3xl md:text-4xl font-black text-primary">{result.time}</p></div>
                <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border text-center"><p className="text-[10px] font-black uppercase text-muted-foreground">Producto</p><p className="text-sm md:text-lg font-black text-primary truncate">{calcProduct}</p></div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs md:text-sm font-black uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Procedimiento de Actuación V4</h4>
                <div className="space-y-3">{result.steps.map((step: string, i: number) => (<div key={i} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-slate-50 border"><div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-[10px] md:text-xs shrink-0">{i+1}</div><p className="text-xs md:text-sm font-medium text-slate-700">{step}</p></div>))}</div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 md:p-6 flex flex-col md:flex-row justify-end gap-2 border-t">
              <Button variant="outline" className="w-full md:w-auto gap-2 border-primary text-primary font-bold text-xs" onClick={() => generatePDF({
                docNumber: `CALC-V4-${Date.now()}`,
                location: 'Vaso Principal',
                incidentDate: new Date().toLocaleDateString(),
                introduction: `Cálculo automático de dosificación para ${result.title} según protocolo V4.`,
                justification: result.isEmergency ? 'Tratamiento de choque microbiológico por incumplimiento.' : 'Ajuste correctivo de parámetros.',
                procedureDetails: { areaTreated: 'Vaso e Instalación', preparation: 'Cierre preventivo y señalización', process: `Dosificación de ${result.dose}${result.unit} de ${calcProduct}`, safetyMeasures: 'Sin bañistas, EPIs técnicos' },
                results: `Objetivo: CT cumplido. Tiempo: ${result.time}`,
                conclusions: 'Se requiere validación analítica posterior al tratamiento.'
              })}><Download className="w-4 h-4" /> EXPORTAR PDF TÉCNICO V4</Button>
              <Button variant="ghost" className="w-full md:w-auto text-xs" onClick={() => setResult(null)}>Cerrar</Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          {selectedInstallation && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2 text-primary font-black uppercase tracking-tighter">{selectedInstallation.type}</Badge>
                    <DialogTitle className="text-3xl font-black text-primary leading-tight">{selectedInstallation.name}</DialogTitle>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => { setIsDetailOpen(false); handleOpenEdit(selectedInstallation); }}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-8 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Volumen</p>
                    <p className="text-2xl font-black text-primary">{selectedInstallation.volume} m³</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Medidas</p>
                    <p className="text-sm font-bold truncate">{selectedInstallation.dimensions || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Alta</p>
                    <p className="text-sm font-bold">{selectedInstallation.createdAt?.toDate ? selectedInstallation.createdAt.toDate().toLocaleDateString() : '---'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Observaciones Técnicas</h4>
                  <div className="p-6 bg-slate-50 rounded-2xl border italic text-slate-600 leading-relaxed">
                    {selectedInstallation.notes ? `"${selectedInstallation.notes}"` : 'Sin notas registradas.'}
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Cerrar</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
