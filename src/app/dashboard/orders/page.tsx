
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Send, 
  CheckCircle2, 
  Clock,
  XCircle,
  FileText,
  Package,
  Trash2,
  ChevronRight,
  MessageSquare,
  History,
  FileEdit,
  Trash,
  Info,
  Building2,
  Layers,
  Pencil,
  AlertTriangle,
  LayoutGrid,
  ListFilter
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
  AlertDialogAction,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, setDoc, deleteDoc, increment, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { Order, OrderItem, OrderStatus, Supplier, CatalogItem, InventoryItem } from '@/lib/types';

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pizarra');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('NONE');
  const [manualItems, setManualItems] = useState<OrderItem[]>([{ name: '', quantity: 1, unit: 'KG' }]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'orders'), orderBy('createdAt', 'desc'));
  }, [db, profile?.tenantId]);

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'suppliers'), orderBy('name', 'asc'));
  }, [db, profile?.tenantId]);

  const catalogQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'orderCatalog'), orderBy('name', 'asc'));
  }, [db, profile?.tenantId]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'inventory'), orderBy('name', 'asc'));
  }, [db, profile?.tenantId]);

  const { data: orders, isLoading: loading } = useCollection<Order>(ordersQuery);
  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);
  const { data: catalog } = useCollection<CatalogItem>(catalogQuery);
  const { data: inventory } = useCollection<InventoryItem>(inventoryQuery);

  const selectedOrder = useMemo(() => orders?.find(o => o.id === selectedOrderId), [orders, selectedOrderId]);

  // Pizarra Logic: Flatten all active items
  const flattenedItems = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter(o => o.status === 'DRAFT' || o.status === 'SENT')
      .flatMap(order => 
        order.items.map(item => ({
          ...item,
          orderId: order.id,
          supplierName: order.supplierName,
          status: order.status,
          createdAt: order.createdAt
        }))
      )
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [orders, searchTerm]);

  const combinedSuggestions = useMemo(() => {
    const suggestions: { name: string; unit: string; source: 'STOCK' | 'CATALOG'; stock?: number }[] = [];
    
    inventory?.forEach(item => {
      suggestions.push({ name: item.name, unit: item.unit, source: 'STOCK', stock: item.currentStock });
    });

    catalog?.forEach(item => {
      if (!suggestions.some(s => s.name.toLowerCase() === item.name.toLowerCase())) {
        suggestions.push({ name: item.name, unit: item.unit, source: 'CATALOG' });
      }
    });

    return suggestions;
  }, [catalog, inventory]);

  const handleOpenCreate = () => {
    setEditingOrder(null);
    setSelectedSupplierId('NONE');
    setManualItems([{ name: '', quantity: 1, unit: 'KG' }]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    if (order.status !== 'DRAFT') {
      toast({ variant: "destructive", title: "Solo borradores", description: "Solo puedes editar pedidos en estado borrador." });
      return;
    }
    setEditingOrder(order);
    setSelectedSupplierId(order.supplierId || 'NONE');
    setManualItems([...order.items]);
    setIsDialogOpen(true);
  };

  const handleAddRow = () => {
    setManualItems([...manualItems, { name: '', quantity: 1, unit: 'UNIDADES' }]);
  };

  const handleRemoveRow = (index: number) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: field === 'quantity' ? parseFloat(value) || 0 : value };
    setManualItems(updated);
  };

  const handleSelectSuggestion = (index: number, suggestion: { name: string; unit: string }) => {
    const updated = [...manualItems];
    updated[index] = { 
      ...updated[index], 
      name: suggestion.name, 
      unit: suggestion.unit as any 
    };
    setManualItems(updated);
  };

  const handleSaveOrder = async () => {
    if (!db || !profile?.tenantId || !user) return;
    const validItems = manualItems.filter(i => i.name.trim() !== '');
    if (validItems.length === 0) return;

    const supplier = suppliers?.find(s => s.id === selectedSupplierId);

    const orderData = {
      status: editingOrder ? editingOrder.status : 'DRAFT',
      items: validItems,
      supplierId: selectedSupplierId === 'NONE' ? null : selectedSupplierId,
      supplierName: supplier?.name || 'Varios / Sin especificar',
      updatedAt: serverTimestamp(),
    };

    if (editingOrder) {
      const orderRef = doc(db, 'tenants', profile.tenantId, 'orders', editingOrder.id);
      updateDocumentNonBlocking(orderRef, orderData);
      toast({ title: "Pedido actualizado" });
    } else {
      const newOrder = {
        ...orderData,
        createdBy: profile.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      const colRef = collection(db, 'tenants', profile.tenantId, 'orders');
      await addDoc(colRef, newOrder);
      toast({ title: "Pedido creado" });
    }

    const catalogCol = collection(db, 'tenants', profile.tenantId, 'orderCatalog');
    validItems.forEach(item => {
      const existsInSuggestions = combinedSuggestions.some(s => s.name.toLowerCase() === item.name.toLowerCase());
      if (!existsInSuggestions) {
        addDoc(catalogCol, { name: item.name, unit: item.unit });
      }
    });

    setIsDialogOpen(false);
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    if (!db || !profile?.tenantId) return;
    const orderRef = doc(db, 'tenants', profile.tenantId, 'orders', orderId);
    
    if (status === 'RECEIVED') {
      const order = orders?.find(o => o.id === orderId);
      if (order) {
        order.items.forEach((orderItem) => {
          const invItem = inventory?.find(i => i.name.toLowerCase() === orderItem.name.toLowerCase());
          if (invItem) {
            const invRef = doc(db, 'tenants', profile.tenantId!, 'inventory', invItem.id);
            updateDocumentNonBlocking(invRef, {
              currentStock: increment(orderItem.quantity),
              updatedAt: serverTimestamp()
            });

            const movementsCol = collection(db, 'tenants', profile.tenantId!, 'stockMovements');
            addDocumentNonBlocking(movementsCol, {
              itemId: invItem.id,
              itemName: invItem.name,
              type: 'ENTRY',
              quantity: orderItem.quantity,
              unit: invItem.unit,
              reason: `Pedido recibido: ${orderId}`,
              createdBy: profile.displayName || user?.email || 'Sistema',
              createdAt: serverTimestamp(),
            });
          }
        });
      }
    }

    updateDocumentNonBlocking(orderRef, { status, updatedAt: serverTimestamp() });
    toast({ title: `Pedido ${status}` });
  };

  const handleConfirmDelete = () => {
    if (!db || !profile?.tenantId || !orderToDelete) return;
    const orderRef = doc(db, 'tenants', profile.tenantId, 'orders', orderToDelete);
    deleteDocumentNonBlocking(orderRef);
    toast({ title: "Pedido eliminado" });
    if (selectedOrderId === orderToDelete) setSelectedOrderId(null);
    setOrderToDelete(null);
  };

  const shareViaWhatsApp = (order: Order) => {
    const hotelName = profile?.tenantName || 'Hotel';
    let message = `*🏨 PEDIDO TÉCNICO - ${hotelName.toUpperCase()}*\n`;
    message += `📅 Fecha: ${new Date().toLocaleDateString()}\n`;
    message += `👤 Solicitado por: ${order.createdBy}\n`;
    if (order.supplierName) message += `🏢 Proveedor: ${order.supplierName}\n\n`;
    message += `*PRODUCTOS SOLICITADOS:*\n`;
    order.items.forEach(item => {
      message += `• ${item.name}: ${item.quantity} ${item.unit}\n`;
    });
    message += `\n_Generado automáticamente por PrestoApp System_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    if (order.status === 'DRAFT') handleUpdateStatus(order.id, 'SENT');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-accent" />
              Suministros Técnicos
            </h2>
            <p className="text-muted-foreground font-medium">Visualización de materiales y gestión de pedidos.</p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg font-bold" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Nuevo Pedido
          </Button>
        </div>

        <Tabs defaultValue="pizarra" onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <TabsList className="bg-white border ring-1 ring-slate-200">
              <TabsTrigger value="pizarra" className="gap-2 font-bold data-[state=active]:bg-accent data-[state=active]:text-white">
                <LayoutGrid className="w-4 h-4" /> Pizarra de Materiales
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="gap-2 font-bold">
                <ListFilter className="w-4 h-4" /> Gestión de Pedidos
              </TabsTrigger>
            </TabsList>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={activeTab === 'pizarra' ? "Buscar material o proveedor..." : "Filtrar pedidos..."} 
                className="pl-10 h-11 bg-white border-slate-200" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="pizarra" className="mt-0">
            <Card className="border-none shadow-sm overflow-hidden ring-1 ring-slate-200">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground h-12">Artículo / Material</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground h-12 text-center">Cant. Solicitada</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground h-12">Proveedor Destino</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground h-12">Estado Pedido</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground h-12 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando pizarra...</TableCell></TableRow>
                    ) : flattenedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No hay materiales pendientes de recibir.</TableCell></TableRow>
                    ) : flattenedItems.map((item, idx) => (
                      <TableRow key={`${item.orderId}-${idx}`} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedOrderId(item.orderId)}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3" /> {item.orderId.substring(0, 8)} • {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : '---'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full font-black text-primary">
                            {item.quantity} <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {item.supplierName || 'Varios'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[9px] font-black uppercase border-none px-2 py-0.5",
                            item.status === 'SENT' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                          )}>
                            {item.status === 'SENT' ? 'SOLICITADO' : 'BORRADOR'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pedidos" className="mt-0">
            <Card className="border-none shadow-sm overflow-hidden ring-1 ring-slate-200">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-black text-[10px] uppercase h-12">Estado</TableHead>
                      <TableHead className="font-black text-[10px] uppercase h-12">Proveedor</TableHead>
                      <TableHead className="font-black text-[10px] uppercase h-12">Artículos</TableHead>
                      <TableHead className="font-black text-[10px] uppercase h-12">Fecha</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase h-12">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando pedidos...</TableCell></TableRow>
                    ) : !orders || orders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No hay pedidos registrados.</TableCell></TableRow>
                    ) : orders.filter(o => o.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())).map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30 group">
                        <TableCell onClick={() => setSelectedOrderId(order.id)} className="cursor-pointer">
                          {order.status === 'DRAFT' && <Badge variant="outline" className="text-slate-500 bg-slate-50 font-black text-[9px]">BORRADOR</Badge>}
                          {order.status === 'SENT' && <Badge className="bg-blue-500 font-black text-[9px]">ENVIADO</Badge>}
                          {order.status === 'RECEIVED' && <Badge className="bg-green-600 font-black text-[9px]">RECIBIDO</Badge>}
                          {order.status === 'CANCELLED' && <Badge variant="destructive" className="font-black text-[9px]">CANCELADO</Badge>}
                        </TableCell>
                        <TableCell onClick={() => setSelectedOrderId(order.id)} className="cursor-pointer">
                          <span className="text-xs font-bold text-slate-900">{order.supplierName}</span>
                        </TableCell>
                        <TableCell onClick={() => setSelectedOrderId(order.id)} className="cursor-pointer">
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px] font-medium">
                            {order.items.map(i => i.name).join(', ')}
                          </p>
                        </TableCell>
                        <TableCell onClick={() => setSelectedOrderId(order.id)} className="cursor-pointer text-[10px] font-bold text-slate-500">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {order.status === 'DRAFT' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={(e) => { e.stopPropagation(); handleOpenEdit(order); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrderId(order.id)}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* AlertDialog for Deletion */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              ¿Confirmar eliminación del pedido?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro del pedido y su rastro en la pizarra serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 font-bold">
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}</DialogTitle>
            <DialogDescription>Añade los artículos que necesitas. El sistema los recordará para futuras sugerencias.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Seleccionar Proveedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="bg-white h-11">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin especificar / Varios</SelectItem>
                  {suppliers?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Artículos del Pedido
                </Label>
                <Button variant="outline" size="sm" onClick={handleAddRow} className="h-8 text-[10px] font-black uppercase border-primary text-primary">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Material
                </Button>
              </div>

              <div className="space-y-3">
                {manualItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-end group bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                    <div className="flex-1 space-y-1.5 relative">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Producto / Material</Label>
                      <Input 
                        value={item.name} 
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        placeholder="Ej: Hipoclorito..."
                        className="bg-white h-10 text-sm font-bold"
                      />
                      {item.name.length > 1 && (
                        <div className="absolute z-50 w-full bg-white border rounded-md shadow-xl mt-1 max-h-48 overflow-y-auto ring-1 ring-black/5">
                          {combinedSuggestions
                            .filter(s => s.name.toLowerCase().includes(item.name.toLowerCase()) && s.name !== item.name)
                            .map((s, sIdx) => (
                              <button 
                                key={sIdx} 
                                type="button"
                                className="w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 border-b last:border-0 flex justify-between items-center"
                                onClick={() => handleSelectSuggestion(idx, s)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{s.name}</span>
                                  {s.stock !== undefined && (
                                    <span className="text-[9px] text-accent font-black uppercase tracking-tighter">Stock: {s.stock} {s.unit}</span>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-[8px] h-4 font-black">
                                  {s.source}
                                </Badge>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Cant.</Label>
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                        className="bg-white text-center font-black h-10 text-base"
                      />
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Unidad</Label>
                      <Select value={item.unit} onValueChange={(v) => handleUpdateItem(idx, 'unit', v)}>
                        <SelectTrigger className="bg-white h-10 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KG">Kilogramos (KG)</SelectItem>
                          <SelectItem value="L">Litros (L)</SelectItem>
                          <SelectItem value="UNIDADES">Unidades (Ud)</SelectItem>
                          <SelectItem value="CAJAS">Cajas</SelectItem>
                          <SelectItem value="PAQUETES">Paquetes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-300 hover:text-red-500 mb-0.5"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={manualItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button variant="ghost" className="font-bold" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-accent px-10 font-black shadow-lg text-white" onClick={handleSaveOrder}>
              {editingOrder ? 'GUARDAR CAMBIOS' : 'REGISTRAR PEDIDO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent className="sm:max-w-[600px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tight">Detalle del Pedido</DialogTitle>
                    <DialogDescription className="font-bold text-xs">
                      Registrado por {selectedOrder.createdBy} — {selectedOrder.createdAt?.toDate?.().toLocaleDateString()}
                    </DialogDescription>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-black px-3 py-1 border-none",
                    selectedOrder.status === 'DRAFT' ? "bg-slate-200 text-slate-700" :
                    selectedOrder.status === 'SENT' ? "bg-blue-100 text-blue-700" :
                    selectedOrder.status === 'RECEIVED' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>{selectedOrder.status}</Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Proveedor: {selectedOrder.supplierName}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border shadow-sm">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="font-black text-primary bg-slate-50 px-2 py-1 rounded text-xs">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="w-full h-12 gap-2 bg-green-600 hover:bg-green-700 font-black shadow-lg shadow-green-100"
                    onClick={() => shareViaWhatsApp(selectedOrder)}
                  >
                    <MessageSquare className="w-4 h-4" /> ENVIAR POR WHATSAPP
                  </Button>
                  {selectedOrder.status === 'SENT' && (
                    <Button 
                      className="w-full h-12 gap-2 bg-primary font-black shadow-lg shadow-primary/20 text-white"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'RECEIVED')}
                    >
                      <Package className="w-4 h-4" /> MARCAR COMO RECIBIDO
                    </Button>
                  )}
                  {selectedOrder.status === 'DRAFT' && (
                    <Button variant="outline" className="w-full h-12 gap-2 border-blue-200 text-blue-700 font-bold" onClick={() => handleOpenEdit(selectedOrder)}>
                      <Pencil className="w-4 h-4" /> EDITAR BORRADOR
                    </Button>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t pt-4 bg-slate-50/50 p-6 -mx-6 -mb-6">
                <Button variant="ghost" className="text-red-500 hover:bg-red-50 mr-auto font-bold h-9" onClick={() => setOrderToDelete(selectedOrder.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar Pedido
                </Button>
                <Button variant="outline" className="font-bold h-9" onClick={() => setSelectedOrderId(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
