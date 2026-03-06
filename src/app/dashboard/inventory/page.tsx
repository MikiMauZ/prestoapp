
"use client"

import React, { useState, useMemo, useEffect } from 'react';
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
  Loader2
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
import { collection, query, orderBy, doc, serverTimestamp, increment, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { InventoryItem, InventoryCategory, InventoryUnit, ProductReference, Supplier } from '@/lib/types';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsAddMovementDialogOpen] = useState(false);
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('EXIT');
  
  const [tempReferences, setTempReferences] = useState<ProductReference[]>([]);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Cleanup for stuck body styles (Safety measure)
  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);

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
  const { data: movements, isLoading: loadingMovements } = useCollection(movementsQuery);
  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);

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

  const handleOpenAdd = () => {
    setTempReferences([]);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setTempReferences(item.references || []);
    setIsEditDialogOpen(true);
  };

  const handleAddReferenceField = () => {
    setTempReferences([...tempReferences, { supplierId: '', supplierName: '', sku: '' }]);
  };

  const handleUpdateReference = (index: number, field: keyof ProductReference, value: string) => {
    const updated = [...tempReferences];
    if (field === 'supplierId') {
      const supplier = suppliers?.find(s => s.id === value);
      updated[index] = { ...updated[index], supplierId: value, supplierName: supplier?.name || '' };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTempReferences(updated);
  };

  const handleRemoveReference = (index: number) => {
    setTempReferences(tempReferences.filter((_, i) => i !== index));
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'inventory');
    addDocumentNonBlocking(colRef, newItem);

    const movementsCol = collection(db, 'tenants', profile.tenantId, 'stockMovements');
    addDocumentNonBlocking(movementsCol, {
      itemName: newItem.name,
      type: 'ENTRY',
      quantity: newItem.currentStock,
      unit: newItem.unit,
      reason: 'Stock inicial de alta de producto',
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
    });

    toast({ title: "Producto añadido", description: "El nuevo artículo ha sido registrado." });
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
      updatedAt: serverTimestamp(),
    };

    const itemRef = doc(db, 'tenants', profile.tenantId, 'inventory', editingItem.id);
    updateDocumentNonBlocking(itemRef, updatedData);

    const movementsCol = collection(db, 'tenants', profile.tenantId, 'stockMovements');
    addDocumentNonBlocking(movementsCol, {
      itemId: editingItem.id,
      itemName: updatedData.name,
      type: 'MODIFICACION',
      quantity: 0,
      unit: updatedData.unit,
      reason: 'Edición de ficha técnica / Referencias',
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
    });

    toast({ title: "Producto actualizado", description: "Los cambios han sido guardados." });
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !editingItem || !user) return;

    // Capture values before any state change
    const idToDelete = editingItem.id;
    const nameToDelete = editingItem.name;
    const stockToDelete = editingItem.currentStock;
    const unitToDelete = editingItem.unit;
    const tenantId = profile.tenantId;
    const userDisplay = profile.displayName || user.email;

    // 1. Close modals via state immediately
    setIsDeleteDialogOpen(false);
    setIsEditDialogOpen(false);

    // 2. WAIT for Radix animations to complete and focus to be restored
    // This is the CRITICAL fix for the freezing issue.
    setTimeout(() => {
      // 3. FORCE cleanup of body styles just in case Radix got confused
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';

      // 4. Perform the deletion in Firestore
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
        createdBy: userDisplay,
        createdAt: serverTimestamp(),
      });

      // 5. Clear the item being edited
      setEditingItem(null);

      toast({ 
        title: "Producto eliminado", 
        description: "La ficha ha sido retirada permanentemente." 
      });
    }, 500); // 500ms allows for full transition completion
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

    toast({ 
      title: type === 'ENTRY' ? "Stock repuesto" : "Salida registrada", 
      description: `Operación completada con éxito.`
    });
    
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
        <div className="flex justify-between items-center">
          <Label className="flex items-center gap-2 text-primary font-bold">
            <Tags className="w-4 h-4" /> Multi-referencias (Proveedores)
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddReferenceField} className="h-7 text-[10px] font-bold">
            <Plus className="w-3 h-3 mr-1" /> Añadir Referencia
          </Button>
        </div>
        
        <div className="space-y-3">
          {tempReferences.map((ref, idx) => (
            <div key={idx} className="flex gap-2 items-end bg-slate-50 p-2 rounded-lg border border-dashed">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-black">Proveedor</Label>
                <Select value={ref.supplierId} onValueChange={(v) => handleUpdateReference(idx, 'supplierId', v)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Elegir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-black">Código Ref. (SKU)</Label>
                <Input 
                  value={ref.sku} 
                  onChange={(e) => handleUpdateReference(idx, 'sku', e.target.value)}
                  className="h-8 text-xs bg-white"
                  placeholder="Ej: ART-1234"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveReference(idx)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {tempReferences.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic text-center py-2">Sin referencias vinculadas.</p>
          )}
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
            <p className="text-muted-foreground font-medium">Control de químicos, reactivos y repuestos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsKardexOpen(true)}>
              <History className="w-4 h-4" />
              Historial (Kardex)
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4" />
              Nuevo Artículo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-50 border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Artículos</p>
                  <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                </div>
                <Layers className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Stock Bajo</p>
                  <p className="text-2xl font-black text-orange-900">{stats.low}</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Agotados</p>
                  <p className="text-2xl font-black text-red-900">{stats.out}</p>
                </div>
                <Package className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b py-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre, SKU o proveedor..." 
                  className="pl-10 h-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" /> Filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-bold">Producto</TableHead>
                  <TableHead className="font-bold">Categoría</TableHead>
                  <TableHead className="text-center font-bold">Referencias</TableHead>
                  <TableHead className="text-center font-bold">Stock Actual</TableHead>
                  <TableHead className="text-center font-bold">Estado</TableHead>
                  <TableHead className="text-right font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">No hay resultados.</TableCell></TableRow>
                ) : filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                  const isOut = item.currentStock <= 0;
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-bold">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Ref: {item.id.substring(0,8)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-black">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {item.references && item.references.length > 0 ? (
                            <Badge variant="secondary" className="text-[9px] font-bold bg-blue-50 text-blue-700">
                              {item.references.length} PROV.
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">---</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn(
                          "text-lg font-black",
                          isOut ? "text-red-600" : isLow ? "text-orange-600" : "text-primary"
                        )}>
                          {item.currentStock} <span className="text-[10px] font-bold text-muted-foreground">{item.unit}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">Min: {item.minStock} {item.unit}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isOut ? (
                          <Badge className="bg-red-600 text-[10px] font-bold">AGOTADO</Badge>
                        ) : isLow ? (
                          <Badge className="bg-orange-500 text-[10px] font-bold">REPONER</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-[10px] font-bold">ÓPTIMO</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 text-green-700 border-green-200"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementType('ENTRY');
                              setIsAddMovementDialogOpen(true);
                            }}
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" /> Entrada
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 text-red-700 border-red-200"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementType('EXIT');
                              setIsAddMovementDialogOpen(true);
                            }}
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" /> Salida
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir al Inventario</DialogTitle>
            <DialogDescription>Registra un nuevo producto para control de stock.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 py-4">
            <ProductFormFields />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary">Guardar Producto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setIsDeleteDialogOpen(false); 
            // Only cleanup editing item if we're not in the middle of a deletion
            setTimeout(() => {
              if (!isDeleteDialogOpen) setEditingItem(null);
            }, 300);
          }
        }}
      >
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" /> Editar Ficha de Producto
            </DialogTitle>
            <DialogDescription>Los cambios se registrarán en el historial.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateItem} className="space-y-4 py-4">
            {editingItem && <ProductFormFields item={editingItem} />}
            <DialogFooter className="pt-4 flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" /> Eliminar Producto
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar Cambios</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Double Check Delete AlertDialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          // If we cancel the alert, we don't want to close the edit dialog
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-600 w-5 h-5" /> ¿Estás seguro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la ficha de <strong>{editingItem?.name}</strong>. Esta operación es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="ghost">Cancelar</Button>
            </AlertDialogCancel>
            <Button 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Sí, eliminar ficha
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsAddMovementDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === 'ENTRY' ? (
                <><ArrowUpCircle className="text-green-600" /> Registrar Entrada</>
              ) : (
                <><ArrowDownCircle className="text-red-600" /> Registrar Salida</>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.name} - Stock actual: {selectedItem?.currentStock} {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterMovement} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad ({selectedItem?.unit})</Label>
              <Input 
                id="quantity" 
                name="quantity" 
                type="number" 
                step="0.01" 
                required 
                className="text-lg font-bold h-12" 
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input id="reason" name="reason" required placeholder="Ej: Dosificación vaso principal" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAddMovementDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className={cn(
                "font-bold",
                movementType === 'ENTRY' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}>
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kardex (History) Dialog */}
      <Dialog open={isKardexOpen} onOpenChange={setIsKardexOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-primary">
              <History className="text-accent" />
              Historial de Movimientos (Kardex)
            </DialogTitle>
            <DialogDescription>Auditoría de almacén.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-100/50 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="font-bold">Fecha/Hora</TableHead>
                  <TableHead className="font-bold">Producto</TableHead>
                  <TableHead className="font-bold text-center">Tipo</TableHead>
                  <TableHead className="font-bold text-right">Cantidad</TableHead>
                  <TableHead className="font-bold">Técnico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMovements ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : !movements || movements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Sin movimientos.</TableCell></TableRow>
                ) : movements.map((mv: any) => (
                  <TableRow key={mv.id} className="text-xs">
                    <TableCell className="whitespace-nowrap font-medium">
                      {mv.createdAt?.toDate ? mv.createdAt.toDate().toLocaleString() : 'Reciente'}
                    </TableCell>
                    <TableCell className="font-bold text-primary">{mv.itemName}</TableCell>
                    <TableCell className="text-center">
                      {mv.type === 'ENTRY' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">ENTRADA</Badge>
                      ) : mv.type === 'MODIFICACION' ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">EDICIÓN</Badge>
                      ) : mv.type === 'ELIMINACION' ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 font-black">ELIMINADO</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200">SALIDA</Badge>
                      )}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-black text-sm",
                      mv.type === 'ENTRY' ? "text-green-600" : (mv.type === 'MODIFICACION' ? "text-blue-600" : "text-red-600")
                    )}>
                      {mv.type === 'ENTRY' ? '+' : mv.type === 'MODIFICACION' ? '~' : '-'}{Math.abs(mv.quantity || 0)} <span className="text-[10px] text-muted-foreground">{mv.unit}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold">{mv.createdBy}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button variant="outline" onClick={() => setIsKardexOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
