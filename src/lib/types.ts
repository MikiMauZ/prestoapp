
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TECH' | 'VIEWER';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: UserRole;
  createdAt: any;
  updatedAt: any;
}

export interface Tenant {
  id: string;
  name: string;
  cif?: string;
  address?: string;
  createdAt: any;
  updatedAt: any;
}

// Water Installations
export type WaterInstallationType = 'PISCINA' | 'ALJIBE' | 'DEPOSITO' | 'SPA' | 'OTRO';

export interface WaterInstallation {
  id: string;
  name: string;
  type: WaterInstallationType;
  volume: number;
  dimensions?: string;
  photos?: string[];
  notes?: string;
  createdAt: any;
}

// Suppliers
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  category?: string;
  notes?: string;
  createdAt?: any;
}

// Inventory & Stock
export type InventoryCategory = 'QUIMICOS' | 'REACTIVOS' | 'REPUESTOS' | 'HERRAMIENTAS' | 'OTROS';
export type InventoryUnit = 'KG' | 'L' | 'UNIDADES' | 'CAJAS';

export interface ProductReference {
  supplierId: string;
  supplierName: string;
  sku: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  minStock: number;
  unit: InventoryUnit;
  lastRestockDate?: any;
  references?: ProductReference[];
  photos?: string[];
  createdAt: any;
  updatedAt: any;
}

// Orders
export type OrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';

export interface OrderItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  sentAt?: any;
  receivedAt?: any;
}

export interface CatalogItem {
  id: string;
  name: string;
  unit: string;
}

// Operational Logbook
export type LogbookEntryType = 'CAMBIO_TURNO' | 'INCIDENCIA' | 'TAREA';
export type ShiftType = 'MAÑANA' | 'TARDE' | 'NOCHE';
export type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type LogbookStatus = 'ABIERTO' | 'EN_PROGRESO' | 'PAUSADO' | 'RESUELTO' | 'CERRADO';

export interface LogbookUpdate {
  text: string;
  userName: string;
  userId: string;
  timestamp: any;
  statusAtTime: LogbookStatus;
  attachments?: string[];
}

export interface LogbookEntry {
  id: string;
  type: LogbookEntryType;
  shift?: ShiftType;
  title: string;
  description: string;
  priority: Priority;
  status: LogbookStatus;
  relatedArea?: string;
  assignedToUserId?: string;
  attachments?: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
  resolutionTimeMinutes?: number;
  updates?: LogbookUpdate[];
}

// Knowledge Base
export type KBCategory = 'BOMBA' | 'ACS' | 'PISCINA' | 'ELECTRICIDAD' | 'NORMATIVA' | 'MANUALES' | 'CLIMATIZACIÓN' | 'MAQUINARIA' | 'SEGURIDAD' | 'OTRO';
export type KBDifficulty = 'BAJA' | 'MEDIA' | 'ALTA';

export interface KnowledgeBaseArticle {
  id: string;
  category: KBCategory;
  title: string;
  problemDescription: string;
  solutionSteps: string;
  tags: string[];
  difficulty: KBDifficulty;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  viewsCount: number;
  images?: string[];
}

// Documents & Certificates
export type DocumentCategory = 'LEGAL' | 'TECNICO' | 'FORMACION' | 'OTROS';
export type DocumentSourceType = 'FILE' | 'LINK';

export interface DocumentRecord {
  id: string;
  title: string;
  category: DocumentCategory;
  type: DocumentSourceType;
  url: string;
  urls?: string[];
  expiryDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: any;
}

// Capex & Winter Works
export type CapexCategory = 'REFORMA' | 'MAQUINARIA' | 'ENERGIA' | 'MOBILIARIO' | 'OTRO';
export type CapexStatus = 'PLANIFICADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
export type CapexProjectType = 'CAPEX' | 'MEJORA_INVIERNO';

export interface CapexProject {
  id: string;
  projectType: CapexProjectType;
  title: string;
  description: string;
  category: CapexCategory;
  status: CapexStatus;
  priority: Priority;
  estimatedBudget: number;
  actualCost: number;
  startDate?: string;
  endDate?: string;
  attachments?: string[];
  notes?: string;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

// Normative / Verifications
export interface VerificationParameter {
  id?: string;
  verificationId?: string;
  tenantId?: string;
  parameterName: string;
  patternValue: number;
  patternReference: string;
  obtainedValue: number;
  deviation: number;
  unit: string;
  tolerance: number;
  result: 'PASS' | 'FAIL';
  photoUrls?: string[];
  createdAt?: any;
}

export interface VerificationRecord {
  id: string;
  tenantId: string;
  verificationDate: string;
  status: 'LOCKED';
  verifiedByUserId: string;
  equipmentId?: string; 
  equipmentName?: string;
  instrumentType: InstrumentType;
  isLocked: boolean;
  lockedAt: string;
  lockedByUserId: string;
  overallResult: 'PASS' | 'FAIL' | 'PENDING';
  createdAt: any;
  updatedAt: any;
}

// Verification Equipment
export type EquipmentStatus = 'ACTIVE' | 'IN_REPAIR' | 'RETIRED';
export type EquipmentType = 'PHOTOMETER' | 'TURBIDIMETER' | 'THERMOMETER' | 'STANDARD_KIT' | 'OTHER';
export type InstrumentType = 'PHOTOMETER' | 'TURBIDIMETER';

export interface VerificationEquipment {
  id: string;
  name: string;
  type: EquipmentType;
  brand?: string;
  model?: string;
  serialNumber: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  expiryDate?: string; 
  status: EquipmentStatus;
  notes?: string;
  createdAt: any;
}

// Memorias de Actuación
export type MemoriaType = 'PREVENTIVO' | 'E_COLI' | 'PSEUDOMONAS' | 'LEGIONELLA' | 'FECAL_SOLIDO' | 'OTRO';

export interface MemoriaActuacion {
  id: string;
  docNumber: string;
  type: MemoriaType;
  location: string;
  installationId?: string;
  incidentDate: string;
  reportDate: string;
  introduction: string;
  justification: string;
  incidentSource?: string;
  affectedParameter?: string;
  procedureDetails: {
    areaTreated: string;
    preparation: string;
    process: string;
    safetyMeasures: string;
    treatmentType?: string;
    concentration?: string;
    contactTime?: string;
  };
  resultsData?: {
    cloroBefore?: number;
    cloroAfter?: number;
    phBefore?: number;
    phAfter?: number;
    otherBefore?: string;
    otherAfter?: string;
  };
  results: string;
  conclusions: string;
  createdBy: string;
  createdAt: any;
  cif?: string;
  address?: string;
  documentHash?: string;
}
