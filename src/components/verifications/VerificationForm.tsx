
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Droplets,
  RefreshCw,
  Hash,
  Loader2,
  Wrench
} from 'lucide-react';
import { PARAMETER_TEMPLATES, calculateParameterStatus } from '@/lib/utils/water-logic';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { VerificationEquipment, InstrumentType } from '@/lib/types';

export default function VerificationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const db = useFirestore();
  
  const initialEquipmentId = searchParams.get('equipmentId');
  
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(initialEquipmentId || 'NONE');
  const [instrument, setInstrument] = useState<InstrumentType>('PHOTOMETER');
  
  // States for form inputs
  const [readings, setReadings] = useState<Record<string, number>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [customPatterns, setCustomPatterns] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeParamForPhoto, setActiveParamForPhoto] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  // Cargar equipos para seleccionar el específico
  const equipmentQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'verificationEquipment'),
      orderBy('name', 'asc')
    );
  }, [db, profile?.tenantId]);

  const { data: allEquipment } = useCollection<VerificationEquipment>(equipmentQuery);

  // Filtrar solo equipos que se pueden verificar (fotómetros y turbidímetros)
  const verifiables = React.useMemo(() => {
    return allEquipment?.filter(e => e.type === 'PHOTOMETER' || e.type === 'TURBIDIMETER') || [];
  }, [allEquipment]);

  useEffect(() => {
    if (selectedEquipmentId !== 'NONE' && verifiables.length > 0) {
      const eq = verifiables.find(e => e.id === selectedEquipmentId);
      if (eq) {
        setInstrument(eq.type as InstrumentType);
      }
    }
  }, [selectedEquipmentId, verifiables]);

  useEffect(() => {
    setReadings({});
    setReferences({});
    setCustomPatterns({});
    setPhotos({});
    setCurrentDate(new Date().toISOString().split('T')[0]);
  }, [instrument]);

  const params = PARAMETER_TEMPLATES[instrument];

  const handleReadingChange = (paramName: string, value: string) => {
    const numValue = parseFloat(value);
    setReadings(prev => ({ ...prev, [paramName]: numValue }));
  };

  const handleRefChange = (paramName: string, value: string) => {
    setReferences(prev => ({ ...prev, [paramName]: value }));
  };

  const handlePatternChange = (paramName: string, value: string) => {
    const numValue = parseFloat(value);
    setCustomPatterns(prev => ({ ...prev, [paramName]: numValue }));
  };

  const handlePhotoClick = (paramName: string) => {
    if (uploadingPhotos[paramName]) return;
    setActiveParamForPhoto(paramName);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeParamForPhoto) {
      const paramName = activeParamForPhoto;
      setUploadingPhotos(prev => ({ ...prev, [paramName]: true }));
      
      try {
        const url = await uploadToCloudinary(file);
        setPhotos(prev => ({ ...prev, [paramName]: url }));
        toast({
          title: "Evidencia guardada",
          description: "La foto del patrón se ha cargado correctamente.",
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast({
          variant: "destructive",
          title: "Error de cámara",
          description: "No se pudo subir la evidencia. Por favor, revisa tu conexión.",
        });
      } finally {
        setUploadingPhotos(prev => ({ ...prev, [paramName]: false }));
        setActiveParamForPhoto(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!db || !profile?.tenantId || !user) return;

    if (selectedEquipmentId === 'NONE') {
      toast({
        variant: "destructive",
        title: "Equipo no seleccionado",
        description: "Debes seleccionar qué equipo específico del inventario estás verificando.",
      });
      return;
    }

    const selectedEq = verifiables.find(e => e.id === selectedEquipmentId);

    // Validation
    const missingPhotos = params.filter(p => !photos[p.name]);
    const missingRefs = params.filter(p => !references[p.name]);
    const missingReadings = params.filter(p => readings[p.name] === undefined);

    if (missingPhotos.length > 0 || missingRefs.length > 0 || missingReadings.length > 0) {
      toast({
        variant: "destructive",
        title: "Registro Incompleto",
        description: "Todos los patrones requieren referencia de lote, lectura y evidencia fotográfica.",
      });
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    
    const verificationRef = doc(collection(db, 'tenants', profile.tenantId, 'verifications'));
    const verificationId = verificationRef.id;

    const verificationData = {
      id: verificationId,
      tenantId: profile.tenantId,
      verificationDate: currentDate,
      instrumentType: instrument,
      equipmentId: selectedEquipmentId,
      equipmentName: selectedEq?.name || 'Equipo taller',
      status: 'LOCKED',
      verifiedByUserId: user.uid,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedByUserId: user.uid,
      overallResult: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    let allPass = true;

    params.forEach((p) => {
      const patternVal = customPatterns[p.name] ?? p.patternValue;
      const obtained = readings[p.name] || 0;
      const deviation = parseFloat((obtained - patternVal).toFixed(2));
      const status = calculateParameterStatus(obtained, patternVal, p.tolerance);
      
      if (status === 'FAIL') allPass = false;

      const paramRef = doc(collection(db, 'tenants', profile.tenantId, 'verifications', verificationId, 'parameters'));
      batch.set(paramRef, {
        id: paramRef.id,
        verificationId,
        tenantId: profile.tenantId,
        parameterName: p.name,
        patternValue: patternVal,
        patternReference: references[p.name] || '',
        obtainedValue: obtained,
        deviation: deviation,
        unit: p.unit,
        tolerance: p.tolerance,
        result: status,
        photoUrl: photos[p.name] || '',
        createdAt: serverTimestamp(),
      });
    });

    verificationData.overallResult = allPass ? 'PASS' : 'FAIL';
    batch.set(verificationRef, verificationData);

    batch.commit()
      .then(() => {
        toast({
          title: "Registro Legal Bloqueado",
          description: "La verificación mensual ha sido firmada y archivada correctamente.",
        });
        router.push('/dashboard/verification-equipment?tab=history');
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: verificationRef.path,
          operation: 'create',
          requestResourceData: verificationData,
        });
        errorEmitter.emit('permission-error', contextualError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-primary text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">Verificación Mensual de Patrones</CardTitle>
              <CardDescription className="text-white/70">Protocolo de Veracidad RD 3/2023 - Firma Digital</CardDescription>
            </div>
            <Lock className="w-8 h-8 text-white/20" />
          </div>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="equipment" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Seleccionar Equipo del Inventario
              </Label>
              <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                <SelectTrigger id="equipment" className={cn("h-12 text-lg", selectedEquipmentId === 'NONE' && "border-orange-500 bg-orange-50")}>
                  <SelectValue placeholder="Selecciona el dispositivo a verificar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" disabled>Seleccionar equipo...</SelectItem>
                  {verifiables.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} (S/N: {eq.serialNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEquipmentId === 'NONE' && (
                <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter animate-pulse">
                  * Debes seleccionar un equipo registrado para iniciar el protocolo
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fecha de Inspección</Label>
              <Input 
                type="date" 
                className="h-12 text-lg" 
                value={currentDate} 
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>
          </div>

          {selectedEquipmentId !== 'NONE' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                <Droplets className="w-5 h-5 text-accent" />
                Protocolo para {instrument === 'PHOTOMETER' ? 'Fotometría' : 'Turbidimetría'}
              </h3>
              
              <div className="space-y-8">
                {params.map((p) => {
                  const patternVal = customPatterns[p.name] ?? p.patternValue;
                  const obtained = readings[p.name];
                  const deviation = obtained !== undefined ? parseFloat((obtained - patternVal).toFixed(2)) : null;
                  const status = obtained !== undefined ? calculateParameterStatus(obtained, patternVal, p.tolerance) : null;
                  const photo = photos[p.name];
                  const isUploading = uploadingPhotos[p.name];
                  
                  return (
                    <div key={p.name} className="flex flex-col gap-6 p-6 rounded-2xl border bg-secondary/20 transition-all hover:shadow-md">
                      <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-xl text-primary uppercase tracking-tight">{p.name}</h4>
                              <p className="text-xs text-muted-foreground font-medium">Tolerancia Técnica: ±{p.tolerance} {p.unit}</p>
                            </div>
                            {status === 'PASS' && <Badge className="bg-green-600 px-3 py-1 font-bold">✓ DENTRO DE RANGO</Badge>}
                            {status === 'FAIL' && <Badge variant="destructive" className="px-3 py-1 font-bold">✗ DESVIACIÓN CRÍTICA</Badge>}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor Nominal del Patrón ({p.unit})</Label>
                              <Input 
                                type="number" 
                                defaultValue={p.patternValue}
                                step="0.01"
                                className="bg-white font-bold h-11"
                                onChange={(e) => handlePatternChange(p.name, e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Referencia de Lote (Kit)
                              </Label>
                              <Input 
                                placeholder="Ej: LOT-2024-X"
                                className="bg-white h-11"
                                onChange={(e) => handleRefChange(p.name, e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-primary">Lectura Obtenida en Equipo</Label>
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                step="0.01"
                                className="text-2xl h-14 font-black border-2 border-primary/20 focus:border-primary bg-white"
                                onChange={(e) => handleReadingChange(p.name, e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground">Desviación Calculada</Label>
                              <div className={cn(
                                "text-3xl h-14 font-black flex items-center px-4 rounded-md border-2 border-dashed bg-white/50",
                                deviation !== null && Math.abs(deviation) > p.tolerance ? "text-red-600" : "text-slate-600"
                              )}>
                                {deviation !== null ? (deviation > 0 ? `+${deviation}` : deviation) : '--'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full lg:w-72">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block">Foto del Equipo con el Patrón</Label>
                          <div 
                            onClick={() => handlePhotoClick(p.name)}
                            className={cn(
                              "relative group cursor-pointer border-2 border-dashed rounded-2xl h-[240px] flex flex-col items-center justify-center gap-3 transition-all overflow-hidden bg-white",
                              photo ? "border-green-500" : "border-muted-foreground/30 hover:border-accent hover:bg-slate-50",
                              isUploading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                                <span className="text-[10px] font-bold uppercase">Procesando...</span>
                              </>
                            ) : photo ? (
                              <>
                                <img src={photo} alt="Evidencia" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <RefreshCw className="text-white w-10 h-10" />
                                </div>
                              </>
                            ) : (
                              <>
                                <Camera className="w-12 h-12 text-muted-foreground group-hover:text-accent" />
                                <div className="text-center px-4">
                                  <span className="text-[10px] font-black text-muted-foreground block uppercase">Capturar Lectura</span>
                                  <span className="text-[9px] text-muted-foreground/60 italic">Evidencia obligatoria</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
        {selectedEquipmentId !== 'NONE' && (
          <CardFooter className="bg-slate-100/50 p-8 flex flex-col items-stretch gap-6 rounded-b-lg animate-in slide-in-from-bottom-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="w-5 h-5" />
              <AlertTitle className="font-bold text-red-900 uppercase">Declaración Jurada de Veracidad</AlertTitle>
              <AlertDescription className="text-red-700 text-xs mt-1 font-medium leading-relaxed">
                Certifico que las lecturas y fotos corresponden a patrones reales trazables realizados con el equipo seleccionado. 
                Este registro quedará sellado y servirá como prueba de cumplimiento normativo ante Sanidad.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-4">
              <Button variant="outline" size="lg" disabled={isSubmitting} onClick={() => router.back()} className="font-bold h-14 px-8">Descartar</Button>
              <Button size="lg" className="px-12 gap-2 text-lg h-14 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 font-black" onClick={handleSubmit} disabled={isSubmitting || Object.values(uploadingPhotos).some(v => v)}>
                {isSubmitting ? "SELLANDO REGISTRO..." : (
                  <>
                    <Lock className="w-5 h-5" />
                    FIRMAR Y ARCHIVAR CONTROL
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
