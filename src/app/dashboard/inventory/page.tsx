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
  Printer
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

  // Data fetching - MOVED UP to avoid ReferenceError in useEffect
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

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

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
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.warn(e));
      }
    };
  }, [isScannerOpen, items, toast]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.references?.some(ref => 
        ref.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ref.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [items, searchTerm]);

  const stats = useMemo(() => {
    if (!items) return { total: 0, low: 0, out: 0 };
    return {
      total: items.length,
      low: items.filter(i => i.currentStock <= i.minStock && i.currentStock > 0).length,
      out: items.filter(i => i.currentStock <= 0).length
    };
  }, [items]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const handleOpenOrderFromSelection = () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items?.filter(i => selectedIds.includes(i.id)) || [];
    const initialOrderItems: OrderItem[] = selectedItems.map(i => ({
      name: i.name,
      quantity: 1,
      unit: i.unit
    }));
    setOrderItems(initialOrderItems);
    setSelectedSupplierId('NONE');
    setIsOrderDialogOpen(true);
  };

  const handleOpenOrderSingle = (item: InventoryItem) => {
    setOrderItems([{ name: item.name, quantity: 1, unit: item.unit }]);
    setSelectedSupplierId('NONE');
    setIsOrderDialogOpen(true);
  };

  const handleUpdateOrderItem = (idx: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], [field]: field === 'quantity' ? parseFloat(value) || 0 : value };
    setOrderItems(updated);
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

  const handleOpenAdd = () => {
    setTempReferences([]);
    setTempPhotos([]);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setTempReferences(item.references || []);
    setTempPhotos(item.photos || []);
    setIsEditDialogOpen(true);
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

  const handleCreateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user) return;

    const formData = new FormData(e.currentTarget);
    const newItem = {
      name: formData.get('name') as string,
      category: formData.get('category') as InventoryCategory,
      unit: formData.get('unit') as InventoryUnit,
      currentStock: parseFloat(formData.get('initialStock') as string) || 0,
      minStock: parseFloat(formData.get('minStock') as string) || 0,
      references: tempReferences.filter(r => r.sku && r.supplierId),
      photos: tempPhotos,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'inventory');
    addDocumentNonBlocking(colRef, newItem);

    toast({ title: "Producto añadido" });
    setIsAddDialogOpen(false);
  };

  const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user || !editingItem) return;

    const formData = new FormData(e.currentTarget);
    const updatedData = {
      name: formData.get('name') as string,
      category: formData.get('category') as InventoryCategory,
      unit: formData.get('unit') as InventoryUnit,
      minStock: parseFloat(formData.get('minStock') as string) || 0,
      references: tempReferences.filter(r => r.sku && r.supplierId),
      photos: tempPhotos,
      updatedAt: serverTimestamp(),
    };

    const itemRef = doc(db, 'tenants', profile.tenantId, 'inventory', editingItem.id);
    updateDocumentNonBlocking(itemRef, updatedData);

    toast({ title: "Producto actualizado" });
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !editingItem || !user) return;

    const idToDelete = editingItem.id;
    const nameToDelete = editingItem.name;
    const stockToDelete = editingItem.currentStock;
    const unitToDelete = editingItem.unit;
    const tenantId = profile.tenantId;
    const userName = profile.displayName || user.email;

    setIsDeleteDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingItem(null);

    setTimeout(() => {
      const itemRef = doc(db, 'tenants', tenantId, 'inventory', idToDelete);
      deleteDocumentNonBlocking(itemRef);

      const movementsCol = collection(db, 'tenants', tenantId, 'stockMovements');
      addDocumentNonBlocking(movementsCol, {
        itemId: idToDelete,
        itemName: nameToDelete,
        type: 'ELIMINACION',
        quantity: -stockToDelete,
        unit: unitToDelete,
        reason: 'Baja definitiva de producto del inventario',
        createdBy: userName,
        createdAt: serverTimestamp(),
      });

      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      
      toast({ title: "Producto eliminado" });
    }, 150); 
  };

  const handleRegisterMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user || !selectedItem) return;

    const formData = new FormData(e.currentTarget);
    const quantity = parseFloat(formData.get('quantity') as string);
    const type = movementType;
    
    if (isNaN(quantity) || quantity <= 0) return;

    const movement = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type,
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
      currentStock: increment(type === 'ENTRY' ? quantity : -quantity),
      updatedAt: serverTimestamp()
    });

    toast({ title: "Stock actualizado" });
    setIsAddMovementDialogOpen(false);
    setSelectedItem(null);
  };

  const ProductFormFields = ({ item }: { item?: InventoryItem }) => (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Producto</Label>
        <Input id="name" name="name" required defaultValue={item?.name} placeholder="Ej: Hipoclorito Sódico 15%" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
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
        <div className="space-y-2">
          <Label htmlFor="unit">Unidad de Medida</Label>
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
        {!item && (
          <div className="space-y-2">
            <Label htmlFor="initialStock">Stock Inicial</Label>
            <Input id="initialStock" name="initialStock" type="number" step="0.01" defaultValue="0" />
          </div>
        )}
        <div className={cn("space-y-2", item ? "col-span-2" : "")}>
          <Label htmlFor="minStock">Stock Mínimo (Alerta de reposición)</Label>
          <Input id="minStock" name="minStock" type="number" step="0.01" defaultValue={item?.minStock || 5} />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <Label className="flex items-center gap-2 text-primary font-bold"><Camera className="w-4 h-4" /> Fotos del Producto</Label>
        <div className="flex flex-wrap gap-2">
          {tempPhotos.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border group">
              <Image src={url} alt={`Ref ${i}`} fill className="object-cover" />
              <button 
                type="button" 
                onClick={() => setTempPhotos(p => p.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent transition-all"
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : (
              <>
                <Camera className="w-4 h-4" />
                <span className="text-[8px] font-bold uppercase">Añadir</span>
              </>
            )}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <Label className="flex items-center gap-2 text-primary font-bold"><Tags className="w-4 h-4" /> Referencias Proveedor</Label>
          <button type="button" onClick={() => setTempReferences([...tempReferences, { supplierId: '', supplierName: '', sku: '' }])} className="text-[10px] font-bold text-accent flex items-center gap-1">
            <Plus className="w-3 h-3" /> Añadir referencia
          </button>
        </div>
        <div className="space-y-3">
          {tempReferences.map((ref, idx) => (
            <div key={idx} className="flex gap-2 items-end bg-slate-50 p-2 rounded-lg border border-dashed">
              <div className="flex-1 space-y-1">
                <Select value={ref.supplierId} onValueChange={(v) => {
                  const s = suppliers?.find(sup => sup.id === v);
                  const updated = [...tempReferences];
                  updated[idx] = { ...updated[idx], supplierId: v, supplierName: s?.name || '' };
                  setTempReferences(updated);
                }}>
                  <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Proveedor..." /></SelectTrigger>
                  <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Input value={ref.sku} onChange={(e) => {
                  const updated = [...tempReferences];
                  updated[idx].sku = e.target.value;
                  setTempReferences(updated);
                }} className="h-8 text-xs bg-white" placeholder="SKU/Código" />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setTempReferences(tempReferences.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              Gestión de Almacén
            </h2>
            <p className="text-muted-foreground font-medium">Control de químicos, reactivos y repuestos técnicos.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 border-accent text-accent font-bold" onClick={() => setIsScannerOpen(true)}>
              <ScanLine className="w-4 h-4" /> Escanear QR
            </Button>
            {selectedIds.length > 0 && (
              <Button className="bg-accent hover:bg-accent/90 gap-2 font-bold animate-in zoom-in-95" onClick={handleOpenOrderFromSelection}>
                <ShoppingCart className="w-4 h-4" /> Generar Pedido ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => setIsKardexOpen(true)}>
              <History className="w-4 h-4" /> Historial
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4" /> Nuevo Artículo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-slate-500 uppercase">Total Artículos</p><p className="text-2xl font-black">{stats.total}</p></div>
                <Layers className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-orange-600 uppercase">Stock Bajo</p><p className="text-2xl font-black text-orange-900">{stats.low}</p></div>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-red-600 uppercase">Agotados</p><p className="text-2xl font-black text-red-900">{stats.out}</p></div>
                <Package className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b py-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar producto..." className="pl-10 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-10">
                    <button onClick={selectAll} className="text-slate-400 hover:text-primary">
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
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : filteredItems.map((item) => (
                  <TableRow key={item.id} className={cn("hover:bg-muted/30", selectedIds.includes(item.id) && "bg-accent/5")}>
                    <TableCell>
                      <button onClick={() => toggleSelection(item.id)} className="text-slate-400 hover:text-primary">
                        {selectedIds.includes(item.id) ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded border bg-slate-50 overflow-hidden shrink-0">
                          {item.photos?.[0] ? <Image src={item.photos[0]} alt="" fill className="object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-200 m-auto absolute inset-0" />}
                        </div>
                        <div>
                          <div className="font-bold">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{item.unit}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-black">{item.category}</Badge></TableCell>
                    <TableCell className="text-center font-black text-lg">{item.currentStock}</TableCell>
                    <TableCell className="text-center">
                      {item.currentStock <= 0 ? (
                        <Badge className="bg-red-600 cursor-pointer hover:scale-105 transition-transform" onClick={() => handleOpenOrderSingle(item)}>AGOTADO</Badge>
                      ) : item.currentStock <= item.minStock ? (
                        <Badge className="bg-orange-500 cursor-pointer hover:scale-105 transition-transform" onClick={() => handleOpenOrderSingle(item)}>REPONER</Badge>
                      ) : (
                        <Badge className="bg-green-600">ÓPTIMO</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setIsQRModalOpen(true); }} className="h-8 w-8 text-slate-500"><QrCode className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-600"><Pencil className="w-4 h-4" /></Button>
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

      {/* MODAL ESCÁNER QR */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-accent" />
              Escáner de Almacén
            </DialogTitle>
            <DialogDescription>Apunta con la cámara al código QR de la estantería.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-2 border-slate-100 min-h-[300px]" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsScannerOpen(false)}>Cerrar Cámara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL QR PRODUCTO */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Etiqueta QR Identificativa</DialogTitle>
            <DialogDescription>Usa este código para entradas y salidas rápidas desde el móvil.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-8 space-y-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="bg-white p-4 rounded-xl shadow-md">
              {selectedItem && (
                <QRCodeSVG 
                  value={selectedItem.id} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                />
              )}
            </div>
            <div className="text-center">
              <p className="font-black text-primary uppercase text-lg">{selectedItem?.name}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">ID TÉCNICO: {selectedItem?.id}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full gap-2 font-bold" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Imprimir Etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVO ARTICULO */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Nuevo Artículo</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 py-4">
            <ProductFormFields />
            <DialogFooter><Button type="submit" className="bg-primary">Guardar Producto</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR ARTICULO */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { 
        setIsEditDialogOpen(open); 
        if (!open) {
          setIsDeleteDialogOpen(false);
          setTimeout(() => setEditingItem(null), 300);
        }
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Editar Producto</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateItem} className="space-y-4 py-4">
            {editingItem && <ProductFormFields item={editingItem} />}
            <DialogFooter className="flex justify-between">
              <Button type="button" variant="outline" className="text-red-600" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
              <Button type="submit" className="bg-blue-600">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOGO CONFIRMACION ELIMINAR */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> ¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción es irreversible y borrará la ficha técnica del inventario.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel>
            <Button onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700">Sí, eliminar permanentemente</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL MOVIMIENTO STOCK */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsAddMovementDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === 'ENTRY' ? <ArrowUpCircle className="text-green-600" /> : <ArrowDownCircle className="text-red-600" />}
              {movementType === 'ENTRY' ? 'Registrar Entrada' : 'Registrar Salida'}
            </DialogTitle>
            <DialogDescription className="font-bold text-primary">{selectedItem?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterMovement} className="space-y-4 py-4">
            <div className="space-y-2"><Label>Cantidad ({selectedItem?.unit})</Label><Input name="quantity" type="number" step="0.01" required /></div>
            <div className="space-y-2"><Label>Motivo</Label><Input name="reason" required placeholder="Ej: Reposición stock" /></div>
            <DialogFooter><Button type="submit" className={movementType === 'ENTRY' ? "bg-green-600" : "bg-red-600"}>Confirmar {movementType === 'ENTRY' ? 'Entrada' : 'Salida'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL GENERAR PEDIDO */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-accent" /> Nuevo Pedido desde Stock</DialogTitle>
            <DialogDescription>Genera un borrador de pedido con los artículos marcados.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-6">
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
              <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Lista de Productos</Label>
              <div className="space-y-3">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-end bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Producto</Label>
                      <Input value={item.name} disabled className="bg-slate-50 text-xs font-bold" />
                    </div>
                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => handleUpdateOrderItem(idx, 'quantity', e.target.value)} className="text-center font-black h-9 text-xs" />
                    </div>
                    <div className="w-20 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Unidad</Label>
                      <Input value={item.unit} disabled className="bg-slate-50 text-center text-[10px]" />
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500 h-9 w-9" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} disabled={orderItems.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

      {/* MODAL KARDEX */}
      <Dialog open={isKardexOpen} onOpenChange={setIsKardexOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Historial de Almacén</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Producto</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Cant.</TableHead></TableRow></TableHeader>
            <TableBody>
              {movements?.map((mv: any) => (
                <TableRow key={mv.id} className="text-xs">
                  <TableCell>{mv.createdAt?.toDate?.().toLocaleString() || 'Reciente'}</TableCell>
                  <TableCell className="font-bold">{mv.itemName}</TableCell>
                  <TableCell><Badge variant="outline">{mv.type}</Badge></TableCell>
                  <TableCell className="text-right font-black">{mv.quantity} {mv.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
