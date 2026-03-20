"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertTriangle,
  History,
  Layers,
  Filter,
  User,
  Pencil,
  Trash2,
  X,
  Tags,
  Settings2,
  Loader2,
  Camera,
  Image as ImageIcon,
  ShoppingCart,
  CheckSquare,
  Square,
  QrCode,
  ScanLine,
  Printer,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, increment, limit, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { InventoryItem, InventoryCategory, InventoryUnit, ProductReference, Supplier, OrderItem } from '@/lib/types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsAddMovementDialogOpen] = useState(false);
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('EXIT');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('NONE');

  const [tempReferences, setTempReferences] = useState<ProductReference[]>([]);
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'inventory'),
      orderBy('name', 'asc')
    );
  }, [db, profile?.tenantId]);

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'suppliers'),
      orderBy('name', 'asc')
    );
  }, [db, profile?.tenantId]);

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'stockMovements'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [db, profile?.tenantId]);

  const { data: items, isLoading: loading } = useCollection<InventoryItem>(inventoryQuery);
  const { data: movements } = useCollection(movementsQuery);
  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);

  // Scanner Logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isScannerOpen) {
      timeoutId = setTimeout(() => {
        const element = document.getElementById("qr-reader");
        if (!element) return;
        const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scanner.render((decodedText) => {
          const item = items?.find(i => i.id === decodedText);
          if (item) {
            scanner.clear().catch(e => console.error(e));
            setIsScannerOpen(false);
            setSelectedItem(item);
            setMovementType('EXIT');
            setIsAddMovementDialogOpen(true);
            toast({ title: "Producto detectado", description: item.name });
          } else {
            toast({ variant: "destructive", title: "QR no reconocido" });
          }
        }, () => {});
        scannerRef.current = scanner;
      }, 350);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.warn(e));
        scannerRef.current = null;
      }
    }
    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current) scannerRef.current.clear().catch(e => console.warn(e));
    };
  }, [isScannerOpen, items, toast]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (activeFilter === 'LOW') {
        matchesFilter = item.currentStock <= item.minStock && item.currentStock > 0;
      } else if (activeFilter === 'OUT') {
        matchesFilter = item.currentStock <= 0;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [items, searchTerm, activeFilter]);

  const stats = useMemo(() => {
    if (!items) return { total: 0, low: 0, out: 0 };
    return {
      total: items.length,
      low: items.filter(i => i.currentStock <= i.minStock && i.currentStock > 0).length,
      out: items.filter(i => i.currentStock <= 0).length
    };
  }, [items]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleOpenOrderFromSelection = () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items?.filter(i => selectedIds.includes(i.id)) || [];
    const initialOrderItems: OrderItem[] = selectedItems.map(i => ({
      name: i.name,
      quantity: Math.max(1, i.minStock * 2 - i.currentStock), // Sugerencia de cantidad inteligente
      unit: i.unit
    }));
    setOrderItems(initialOrderItems);
    setSelectedSupplierId('NONE');
    setIsOrderDialogOpen(true);
  };

  const handleReponerTodo = () => {
    if (!items) return;
    const lowAndOutItems = items.filter(i => i.currentStock <= i.minStock);
    if (lowAndOutItems.length === 0) {
      toast({ title: "Stock al día", description: "No hay productos bajo mínimos actualmente." });
      return;
    }
    const initialOrderItems: OrderItem[] = lowAndOutItems.map(i => ({
      name: i.name,
      quantity: Math.max(1, i.minStock * 2 - i.currentStock),
      unit: i.unit
    }));
    setOrderItems(initialOrderItems);
    setSelectedSupplierId('NONE');
    setIsOrderDialogOpen(true);
  };

  const handleSaveOrder = async () => {
    if (!db || !profile?.tenantId || !user) return;
    const validItems = orderItems.filter(i => i.name.trim() !== '');
    if (validItems.length === 0) return;
    const supplier = suppliers?.find(s => s.id === selectedSupplierId);
    const newOrder = {
      status: 'DRAFT',
      items: validItems,
      supplierId: selectedSupplierId === 'NONE' ? null : selectedSupplierId,
      supplierName: supplier?.name || 'Varios / Sin especificar',
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const colRef = collection(db, 'tenants', profile.tenantId, 'orders');
    await addDoc(colRef, newOrder);
    toast({ title: "Borrador de Pedido Creado" });
    setIsOrderDialogOpen(false);
    setSelectedIds([]);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setTempPhotos(prev => [...prev, ...urls]);
      toast({ title: "Fotos añadidas" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de carga" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user || !selectedItem) return;
    const formData = new FormData(e.currentTarget);
    const quantity = parseFloat(formData.get('quantity') as string);
    if (isNaN(quantity) || quantity <= 0) return;
    const movement = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: movementType,
      quantity,
      unit: selectedItem.unit,
      reason: formData.get('reason') as string,
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
    };
    const movementsCol = collection(db, 'tenants', profile.tenantId, 'stockMovements');
    addDocumentNonBlocking(movementsCol, movement);
    const itemRef = doc(db, 'tenants', profile.tenantId, 'inventory', selectedItem.id);
    updateDocumentNonBlocking(itemRef, {
      currentStock: increment(movementType === 'ENTRY' ? quantity : -quantity),
      updatedAt: serverTimestamp()
    });
    toast({ title: "Stock actualizado" });
    setIsAddMovementDialogOpen(false);
    setSelectedItem(null);
  };

  const ProductFormFields = ({ item }: { item?: InventoryItem }) => (
    <>
      <div className="space-y-2"><Label>Nombre del Producto</Label><Input name="name" required defaultValue={item?.name} placeholder="Ej: Hipoclorito Sódico 15%" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Categoría</Label>
          <Select name="category" defaultValue={item?.category || "QUIMICOS"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="QUIMICOS">Químicos</SelectItem>
              <SelectItem value="REACTIVOS">Reactivos</SelectItem>
              <SelectItem value="REPUESTOS">Repuestos</SelectItem>
              <SelectItem value="HERRAMIENTAS">Herramientas</SelectItem>
              <SelectItem value="OTROS">Otros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Unidad de Medida</Label>
          <Select name="unit" defaultValue={item?.unit || "KG"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="KG">Kilogramos (KG)</SelectItem>
              <SelectItem value="L">Litros (L)</SelectItem>
              <SelectItem value="UNIDADES">Unidades</SelectItem>
              <SelectItem value="CAJAS">Cajas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {!item && <div className="space-y-2"><Label>Stock Inicial</Label><Input name="initialStock" type="number" step="0.01" defaultValue="0" /></div>}
        <div className={cn("space-y-2", item ? "col-span-2" : "")}><Label>Stock Mínimo</Label><Input name="minStock" type="number" step="0.01" defaultValue={item?.minStock || 5} /></div>
      </div>
      <div className="space-y-4 pt-4 border-t">
        <Label className="flex items-center gap-2 text-primary font-bold"><Camera className="w-4 h-4" /> Fotos</Label>
        <div className="flex flex-wrap gap-2">
          {tempPhotos.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border group">
              <Image src={url} alt="" fill className="object-cover" />
              <button type="button" onClick={() => setTempPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent">
            {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
        </div>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              Gestión de Almacén
            </h2>
            <p className="text-muted-foreground font-medium">Control de químicos, reactivos y repuestos técnicos.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 border-accent text-accent font-bold" onClick={() => setIsScannerOpen(true)}>
              <ScanLine className="w-4 h-4" /> Escanear QR
            </Button>
            <Button variant="outline" className="gap-2 border-primary text-primary font-bold" onClick={handleReponerTodo}>
              <RefreshCw className="w-4 h-4" /> Reponer Todo
            </Button>
            {selectedIds.length > 0 && (
              <Button className="bg-accent hover:bg-accent/90 gap-2 font-bold animate-in zoom-in-95" onClick={handleOpenOrderFromSelection}>
                <ShoppingCart className="w-4 h-4" /> Generar Pedido ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => setIsKardexOpen(true)}>
              <History className="w-4 h-4" /> Historial
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg font-bold" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Nuevo Artículo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={cn(
            "border-none cursor-pointer transition-all",
            activeFilter === 'ALL' ? "ring-2 ring-primary shadow-lg" : "bg-slate-50 border-slate-200"
          )} onClick={() => setActiveFilter('ALL')}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-slate-500 uppercase">Total Artículos</p><p className="text-2xl font-black">{stats.total}</p></div>
                <Layers className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "border-none cursor-pointer transition-all",
            activeFilter === 'LOW' ? "ring-2 ring-orange-500 shadow-lg bg-orange-50" : "bg-orange-50/50 border-orange-100"
          )} onClick={() => setActiveFilter('LOW')}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-orange-600 uppercase">Stock Bajo</p><p className="text-2xl font-black text-orange-900">{stats.low}</p></div>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "border-none cursor-pointer transition-all",
            activeFilter === 'OUT' ? "ring-2 ring-red-500 shadow-lg bg-red-50" : "bg-red-50/50 border-red-100"
          )} onClick={() => setActiveFilter('OUT')}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-red-600 uppercase">Agotados</p><p className="text-2xl font-black text-red-900">{stats.out}</p></div>
                <Package className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden ring-1 ring-slate-200">
          <CardHeader className="bg-white border-b py-4">
            <div className="flex justify-between items-center gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar producto..." className="pl-10 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              {activeFilter !== 'ALL' && (
                <Button variant="ghost" size="sm" className="text-xs gap-2 font-bold" onClick={() => setActiveFilter('ALL')}>
                  <X className="w-3 h-3" /> Limpiar Filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-10">
                    <button onClick={() => setSelectedIds(selectedIds.length === filteredItems.length ? [] : filteredItems.map(i => i.id))} className="text-slate-400 hover:text-primary">
                      {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead className="font-bold">Producto</TableHead>
                  <TableHead className="font-bold">Categoría</TableHead>
                  <TableHead className="text-center font-bold">Stock</TableHead>
                  <TableHead className="text-center font-bold">Estado</TableHead>
                  <TableHead className="text-right font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow> : filteredItems.map((item) => (
                  <TableRow key={item.id} className={cn("hover:bg-muted/30 transition-colors", selectedIds.includes(item.id) && "bg-accent/5")}>
                    <TableCell><button onClick={() => toggleSelection(item.id)} className="text-slate-400">{selectedIds.includes(item.id) ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}</button></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded border bg-slate-50 overflow-hidden shrink-0">
                          {item.photos?.[0] ? <Image src={item.photos[0]} alt="" fill className="object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-200 m-auto absolute inset-0" />}
                        </div>
                        <div className="font-bold text-sm">{item.name}</div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-black uppercase">{item.category}</Badge></TableCell>
                    <TableCell className="text-center font-black text-lg">{item.currentStock} <span className="text-[10px] text-muted-foreground uppercase">{item.unit}</span></TableCell>
                    <TableCell className="text-center">
                      {item.currentStock <= 0 ? <Badge className="bg-red-600">AGOTADO</Badge> : item.currentStock <= item.minStock ? <Badge className="bg-orange-500">REPONER</Badge> : <Badge className="bg-green-600">ÓPTIMO</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setIsQRModalOpen(true); }} className="h-8 w-8 text-slate-500"><QrCode className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsEditDialogOpen(true); }} className="h-8 w-8 text-blue-600"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setMovementType('ENTRY'); setIsAddMovementDialogOpen(true); }} className="h-8 text-green-700">Entrada</Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setMovementType('EXIT'); setIsAddMovementDialogOpen(true); }} className="h-8 text-red-700">Salida</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modals (Repetir lógica de modales de la versión anterior para mantener funcionalidad) */}
      {/* ... (Modales de QR, Nuevo, Editar, Movimiento, Kardex, etc.) */}
      
      {/* MODAL GENERAR PEDIDO */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-accent" /> Reposición de Materiales</DialogTitle>
            <DialogDescription>Genera un borrador de pedido basado en el stock crítico.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20">
            <div className="space-y-2">
              <Label>Proveedor Sugerido</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="bg-white h-11"><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Varios / Sin especificar</SelectItem>
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Productos a Pedir</Label>
              <div className="space-y-3">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-end bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex-1 space-y-1.5"><Label className="text-[10px] text-muted-foreground">Producto</Label><Input value={item.name} disabled className="bg-slate-50 text-xs font-bold" /></div>
                    <div className="w-24 space-y-1.5"><Label className="text-[10px] text-muted-foreground">Cantidad</Label><Input type="number" value={item.quantity} onChange={(e) => { const updated = [...orderItems]; updated[idx].quantity = parseFloat(e.target.value) || 0; setOrderItems(updated); }} className="text-center font-black h-9 text-xs" /></div>
                    <div className="w-20 space-y-1.5"><Label className="text-[10px] text-muted-foreground">Unidad</Label><Input value={item.unit} disabled className="bg-slate-50 text-center text-[10px]" /></div>
                    <Button variant="ghost" size="icon" className="text-red-500 h-9 w-9" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} disabled={orderItems.length === 1}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setIsOrderDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-accent px-8 font-black text-white shadow-lg" onClick={handleSaveOrder}>CREAR BORRADOR DE PEDIDO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVO ARTICULO */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Artículo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addDocumentNonBlocking(collection(db!, 'tenants', profile!.tenantId, 'inventory'), {
              name: formData.get('name'),
              category: formData.get('category'),
              unit: formData.get('unit'),
              currentStock: parseFloat(formData.get('initialStock') as string) || 0,
              minStock: parseFloat(formData.get('minStock') as string) || 0,
              photos: tempPhotos,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setIsAddDialogOpen(false);
            setTempPhotos([]);
            toast({ title: "Producto añadido" });
          }} className="space-y-4 py-4">
            <ProductFormFields />
            <DialogFooter><Button type="submit" className="bg-primary">Guardar Producto</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL QR */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Etiqueta QR</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center justify-center p-8 space-y-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="bg-white p-4 rounded-xl shadow-md">{selectedItem && <QRCodeSVG value={selectedItem.id} size={200} level="H" includeMargin={true} />}</div>
            <div className="text-center">
              <p className="font-black text-primary uppercase text-lg">{selectedItem?.name}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">ID: {selectedItem?.id}</p>
            </div>
          </div>
          <DialogFooter><Button variant="outline" className="w-full gap-2 font-bold" onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL MOVIMIENTO */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsAddMovementDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{movementType === 'ENTRY' ? 'Registrar Entrada' : 'Registrar Salida'}</DialogTitle>
            <DialogDescription className="font-bold text-primary">{selectedItem?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterMovement} className="space-y-4 py-4">
            <div className="space-y-2"><Label>Cantidad ({selectedItem?.unit})</Label><Input name="quantity" type="number" step="0.01" required /></div>
            <div className="space-y-2"><Label>Motivo</Label><Input name="reason" required placeholder="Ej: Reposición stock" /></div>
            <DialogFooter><Button type="submit" className={movementType === 'ENTRY' ? "bg-green-600" : "bg-red-600"}>Confirmar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}