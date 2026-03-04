"use client"

import React, { useState, useMemo } from 'react';
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
  MoreVertical,
  Layers,
  Filter
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
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { InventoryItem, InventoryCategory, InventoryUnit } from '@/lib/types';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsAddMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('EXIT');
  
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

  const { data: items, isLoading: loading } = useCollection<InventoryItem>(inventoryQuery);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'tenants', profile.tenantId, 'inventory');
    addDocumentNonBlocking(colRef, newItem);

    toast({ title: "Producto añadido", description: "El nuevo artículo ha sido registrado en el inventario." });
    setIsAddDialogOpen(false);
  };

  const handleRegisterMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !profile?.tenantId || !user || !selectedItem) return;

    const formData = new FormData(e.currentTarget);
    const quantity = parseFloat(formData.get('quantity') as string);
    const type = movementType;
    
    if (isNaN(quantity) || quantity <= 0) return;

    // 1. Create movement record
    const movement = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type,
      quantity,
      reason: formData.get('reason') as string,
      createdBy: profile.displayName || user.email,
      createdAt: serverTimestamp(),
    };

    const movementsCol = collection(db, 'tenants', profile.tenantId, 'stockMovements');
    addDocumentNonBlocking(movementsCol, movement);

    // 2. Update item stock
    const itemRef = doc(db, 'tenants', profile.tenantId, 'inventory', selectedItem.id);
    updateDocumentNonBlocking(itemRef, {
      currentStock: increment(type === 'ENTRY' ? quantity : -quantity),
      updatedAt: serverTimestamp()
    });

    toast({ 
      title: type === 'ENTRY' ? "Stock repuesto" : "Salida registrada", 
      description: `Se han ${type === 'ENTRY' ? 'añadido' : 'retirado'} ${quantity} ${selectedItem.unit} de ${selectedItem.name}.`
    });
    
    setIsAddMovementDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              Gestión de Stock
            </h2>
            <p className="text-muted-foreground font-medium">Control de químicos, reactivos y repuestos técnicos.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="w-4 h-4" />
                Nuevo Artículo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Añadir al Inventario</DialogTitle>
                <DialogDescription>Registra un nuevo producto para control de stock.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto</Label>
                  <Input id="name" name="name" required placeholder="Ej: Hipoclorito Sódico 15%" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category" defaultValue="QUIMICOS">
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
                    <Select name="unit" defaultValue="KG">
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
                  <div className="space-y-2">
                    <Label htmlFor="initialStock">Stock Inicial</Label>
                    <Input id="initialStock" name="initialStock" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Stock Mínimo (Alerta)</Label>
                    <Input id="minStock" name="minStock" type="number" step="0.01" defaultValue="5" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary">Guardar en Almacén</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-50 border-slate-200">
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
          <Card className="bg-orange-50 border-orange-100">
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
          <Card className="bg-red-50 border-red-100">
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
                  placeholder="Buscar por nombre o categoría..." 
                  className="pl-10 h-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" /> Filtros
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="w-4 h-4" /> Ver Kardex
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
                  <TableHead className="text-center font-bold">Stock Actual</TableHead>
                  <TableHead className="text-center font-bold">Estado</TableHead>
                  <TableHead className="text-right font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando almacén...</TableCell></TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No hay artículos que coincidan con la búsqueda.</TableCell></TableRow>
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
                          <Badge className="bg-orange-500 text-[10px] font-bold">REPONER YA</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-[10px] font-bold">OPTIMO</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 text-green-700 border-green-200 hover:bg-green-50"
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
                            className="h-8 gap-1 text-red-700 border-red-200 hover:bg-red-50"
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

      {/* Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsAddMovementDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === 'ENTRY' ? (
                <><ArrowUpCircle className="text-green-600" /> Registrar Entrada Stock</>
              ) : (
                <><ArrowDownCircle className="text-red-600" /> Registrar Salida Stock</>
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
              <Label htmlFor="reason">Motivo del Movimiento</Label>
              <Input id="reason" name="reason" required placeholder={movementType === 'ENTRY' ? "Ej: Pedido recibido proveedor" : "Ej: Dosificación piscina principal"} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAddMovementDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className={cn(
                "font-bold",
                movementType === 'ENTRY' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}>
                Confirmar Operación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}