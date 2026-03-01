
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
  Layers
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
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { Order, OrderItem, OrderStatus, Supplier, CatalogItem, InventoryItem } from '@/lib/types';

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('NONE');
  const [manualItems, setManualItems] = useState<OrderItem[]>([{ name: '', quantity: 1, unit: 'KG' }]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
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

  // Unified suggestions from catalog and inventory
  const combinedSuggestions = useMemo(() => {
    const suggestions: { name: string; unit: string; source: 'STOCK' | 'CATALOG' }[] = [];
    
    inventory?.forEach(item => {
      suggestions.push({ name: item.name, unit: item.unit, source: 'STOCK' });
    });

    catalog?.forEach(item => {
      // Avoid duplicates if already in inventory
      if (!suggestions.some(s => s.name.toLowerCase() === item.name.toLowerCase())) {
        suggestions.push({ name: item.name, unit: item.unit, source: 'CATALOG' });
      }
    });

    return suggestions;
  }, [catalog, inventory]);

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

  const handleCreateOrder = async () => {
    if (!db || !profile?.tenantId || !user) return;
    const validItems = manualItems.filter(i => i.name.trim() !== '');
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

    // Update catalog with new manual items that aren't in catalog or inventory
    const catalogCol = collection(db, 'tenants', profile.tenantId, 'orderCatalog');
    validItems.forEach(item => {
      const existsInSuggestions = combinedSuggestions.some(s => s.name.toLowerCase() === item.name.toLowerCase());
      if (!existsInSuggestions) {
        addDoc(catalogCol, { name: item.name, unit: item.unit });
      }
    });

    toast({ title: "Pedido creado", description: "El borrador ha sido registrado correctamente." });
    setManualItems([{ name: '', quantity: 1, unit: 'KG' }]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    if (!db || !profile?.tenantId) return;
    const orderRef = doc(db, 'tenants', profile.tenantId, 'orders', orderId);
    updateDocumentNonBlocking(orderRef, { status, updatedAt: serverTimestamp() });
    toast({ title: `Pedido ${status}` });
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
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-accent" />
              Pedidos Técnicos
            </h2>
            <p className="text-muted-foreground font-medium">Entrada de suministros con selección desde Stock.</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90 shadow-lg">
                <Plus className="w-4 h-4" />
                Nuevo Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-6 bg-slate-50 border-b">
                <DialogTitle>Configurar Pedido</DialogTitle>
                <DialogDescription>Selecciona artículos de tu Stock o escribe nuevos para guardarlos.</DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Seleccionar Proveedor (Opcional)</Label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger className="bg-white">
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
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lista de Artículos</Label>
                    <Button variant="outline" size="sm" onClick={handleAddRow} className="h-7 text-[10px] font-bold">
                      <Plus className="w-3 h-3 mr-1" /> Añadir Fila
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {manualItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-end group">
                        <div className="flex-1 space-y-1.5 relative">
                          <Label className="text-[10px] text-muted-foreground">Nombre del Producto</Label>
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="Ej: Hipoclorito Sódico 15%"
                            className="bg-white"
                          />
                          {/* Suggestion List */}
                          {item.name.length > 1 && (
                            <div className="absolute z-50 w-full bg-white border rounded-md shadow-xl mt-1 max-h-48 overflow-y-auto">
                              {combinedSuggestions
                                .filter(s => s.name.toLowerCase().includes(item.name.toLowerCase()) && s.name !== item.name)
                                .map((s, sIdx) => (
                                  <button 
                                    key={sIdx} 
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b last:border-0 flex justify-between items-center"
                                    onClick={() => handleSelectSuggestion(idx, s)}
                                  >
                                    <span className="font-medium">{s.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground">({s.unit})</span>
                                      <Badge variant="outline" className={cn(
                                        "text-[8px] font-black uppercase tracking-tighter h-4 px-1",
                                        s.source === 'STOCK' ? "border-blue-200 text-blue-600 bg-blue-50" : "border-slate-200 text-slate-500"
                                      )}>
                                        {s.source === 'STOCK' ? <><Layers className="w-2 h-2 mr-0.5" /> STOCK</> : 'HISTORIAL'}
                                      </Badge>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                        <div className="w-24 space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                            className="bg-white text-center font-bold"
                          />
                        </div>
                        <div className="w-32 space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground">Unidad</Label>
                          <Select value={item.unit} onValueChange={(v) => handleUpdateItem(idx, 'unit', v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="KG">Kilogramos</SelectItem>
                              <SelectItem value="L">Litros</SelectItem>
                              <SelectItem value="UNIDADES">Unidades</SelectItem>
                              <SelectItem value="CAJAS">Cajas</SelectItem>
                              <SelectItem value="PAQUETES">Paquetes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-red-500 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-accent px-8 font-bold" onClick={handleCreateOrder}>
                  Registrar Pedido
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b py-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Registro de Pedidos</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar en historial..." 
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-bold">Estado</TableHead>
                  <TableHead className="font-bold">Proveedor</TableHead>
                  <TableHead className="font-bold">Resumen de Productos</TableHead>
                  <TableHead className="font-bold">Fecha</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : !orders || orders.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No hay pedidos registrados.</TableCell></TableRow>
                ) : orders.filter(o => o.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || o.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))).map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedOrderId(order.id)}>
                    <TableCell>
                      {order.status === 'DRAFT' && <Badge variant="outline" className="text-slate-500 bg-slate-50">BORRADOR</Badge>}
                      {order.status === 'SENT' && <Badge className="bg-blue-500">ENVIADO</Badge>}
                      {order.status === 'RECEIVED' && <Badge className="bg-green-600">RECIBIDO</Badge>}
                      {order.status === 'CANCELLED' && <Badge variant="destructive">CANCELADO</Badge>}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold">{order.supplierName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-xs">{order.items.length} artículos</span>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">
                        {order.items.map(i => i.name).join(', ')}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-bold">Detalle de Pedido</DialogTitle>
                    <DialogDescription>Solicitado por {selectedOrder.createdBy} el {selectedOrder.createdAt?.toDate?.().toLocaleDateString()}</DialogDescription>
                  </div>
                  <Badge className={cn(
                    "text-xs font-black px-3 py-1",
                    selectedOrder.status === 'DRAFT' ? "bg-slate-200 text-slate-700" :
                    selectedOrder.status === 'SENT' ? "bg-blue-100 text-blue-700" :
                    selectedOrder.status === 'RECEIVED' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>{selectedOrder.status}</Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Proveedor: {selectedOrder.supplierName}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                        <span className="font-medium">{item.name}</span>
                        <span className="font-black text-primary">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 font-bold"
                    onClick={() => shareViaWhatsApp(selectedOrder)}
                  >
                    <MessageSquare className="w-4 h-4" /> Enviar WhatsApp
                  </Button>
                  {selectedOrder.status === 'SENT' && (
                    <Button 
                      className="w-full gap-2 bg-primary font-bold shadow-lg"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'RECEIVED')}
                    >
                      <Package className="w-4 h-4" /> Marcar Recibido
                    </Button>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t pt-4">
                {selectedOrder.status === 'DRAFT' && (
                  <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}>Anular Pedido</Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrderId(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
