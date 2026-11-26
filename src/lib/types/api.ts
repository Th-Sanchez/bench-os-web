export type Role = 'OWNER' | 'ATTENDANT' | 'TECHNICIAN';

export type CommissionBasis = 'LABOR_ONLY' | 'TOTAL_PRICE' | 'NET_PROFIT';

export type Voltage = 'V110' | 'V220' | 'BIVOLT' | 'BATTERY' | 'UNKNOWN';

export type ItemStatus =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'QUOTE_SENT'
  | 'APPROVED'
  | 'WAITING_PARTS'
  | 'IN_REPAIR'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'REJECTED'
  | 'DISCARDED'
  | 'CANCELLED';

export type OrderPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH';

export type PartRequestStatus = 'TO_ORDER' | 'ORDERED' | 'ARRIVED' | 'CANCELLED';

export type PhotoStage = 'INTAKE' | 'DIAGNOSIS' | 'COMPLETED';

export type WhatsappMessageStage = 'INTAKE' | 'QUOTE' | 'READY';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionCategory =
  | 'REPAIR_PAYMENT'
  | 'PARTS_PURCHASE'
  | 'OPERATIONAL_EXPENSE'
  | 'OTHER';

export type TransactionPaymentMethod =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'STORE_CREDIT';

export type TransactionStatus = 'PENDING' | 'PAID';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
  timestamp?: string;
  requestId?: string;
  retryAfterSeconds?: number;
}

// IAM
export interface UserResponse {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  commissionPercent?: number;
  createdAt: string;
}

export interface TechnicianOptionResponse {
  id: string;
  name: string;
  role: Role;
}

export interface TenantResponse {
  id: string;
  name: string;
  document: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: UserResponse;
  tenant: TenantResponse;
}

/** Client-safe session returned by the Next.js BFF (never exposes accessToken). */
export interface ClientSession {
  expiresAt: string;
  user: UserResponse;
  tenant: TenantResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface RegisterTenantRequest {
  shopName: string;
  document: string;
  phone: string;
  ownerName: string;
  email: string;
  password: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
  commissionPercent?: number;
}

export interface TenantSettingsResponse {
  tenantId: string;
  defaultLaborCost: number;
  defaultEstimatedDays: number;
  abandonmentDays: number;
  whatsappIntakeTemplate: string | null;
  whatsappQuoteTemplate: string | null;
  whatsappReadyTemplate: string | null;
  customApplianceTypes: string[];
  googleReviewUrl: string | null;
  deliverySignatureEnabled: boolean;
  intakeChecklistTemplates: Record<string, string[]>;
  pixKey: string | null;
  pixReceiverName: string | null;
  pixReceiverCity: string | null;
  shopLogoDataUrl: string | null;
  shopAddress: string | null;
  businessHours: string | null;
  warrantyTerms: string | null;
  careTipsTemplates: Record<string, string[]>;
  technicianAssignmentEnabled: boolean;
  commissionBasis: CommissionBasis;
}

export interface UpdateShopBrandingRequest {
  shopLogoDataUrl?: string;
  clearLogo?: boolean;
  shopAddress?: string;
  businessHours?: string;
  warrantyTerms?: string;
}

export interface UpdateTenantSettingsRequest {
  defaultLaborCost: number;
  defaultEstimatedDays: number;
  abandonmentDays: number;
  whatsappIntakeTemplate?: string;
  whatsappQuoteTemplate: string;
  whatsappReadyTemplate?: string;
  googleReviewUrl?: string;
  deliverySignatureEnabled?: boolean;
  pixKey?: string;
  pixReceiverName?: string;
  pixReceiverCity?: string;
  technicianAssignmentEnabled?: boolean;
  commissionBasis?: CommissionBasis;
}

// Customer
export interface CustomerResponse {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  document: string | null;
  notes: string | null;
  createdAt: string;
}

export interface UpsertCustomerRequest {
  name: string;
  phone: string;
  document?: string;
  notes?: string;
}

// Order
export interface IntakeChecklistEntry {
  label: string;
  checked: boolean;
}

export interface CreateServiceOrderItemRequest {
  applianceType: string;
  brand: string;
  model?: string;
  voltage: Voltage;
  serialNumber?: string;
  accessories?: string;
  reportedIssue: string;
  intakeChecklist?: IntakeChecklistEntry[];
}

export interface CreateServiceOrderRequest {
  customerId: string;
  notes?: string;
  items: CreateServiceOrderItemRequest[];
}

export interface ServiceOrderItemResponse {
  id: string;
  itemIndex: number;
  tag: string;
  applianceType: string;
  brand: string;
  model: string | null;
  voltage: Voltage;
  serialNumber: string | null;
  accessories: string | null;
  intakeChecklist?: IntakeChecklistEntry[];
  reportedIssue: string;
  technicalDiagnosis: string | null;
  status: ItemStatus;
  laborCost: number;
  partsCost: number;
  partsCostActual: number;
  discount: number;
  totalPrice: number;
  estimatedNetProfit: number;
  estimatedCompletionDate: string | null;
  warrantyDays: number;
  cancellationReason: string | null;
  approvedAt: string | null;
  finishedAt: string | null;
  deliveredAt: string | null;
  deliverySignatureSvg: string | null;
  deliverySignerName: string | null;
  discardedAt: string | null;
  parentItemId: string | null;
  parentOrderId: string | null;
  parentItemTag: string | null;
  warrantyReturn: boolean;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  commissionPercent?: number | null;
  commissionAmount?: number | null;
  selectedQuoteOptionId?: string | null;
  selectedQuoteOptionLabel?: string | null;
  quoteOptions?: QuoteOptionResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrderResponse {
  id: string;
  tenantId: string;
  orderNumber: number;
  publicToken: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  createdByUserId: string;
  notes: string | null;
  customerRating: number | null;
  customerFeedback: string | null;
  customerRatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ServiceOrderItemResponse[];
}

export interface OrderItemQueueResponse {
  id: string;
  serviceOrderId: string;
  orderNumber: number;
  itemIndex: number;
  tag: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  applianceType: string;
  brand: string;
  model: string | null;
  voltage: Voltage;
  reportedIssue: string;
  status: ItemStatus;
  totalPrice: number;
  estimatedCompletionDate: string | null;
  finishedAt: string | null;
  parentItemId: string | null;
  warrantyReturn: boolean;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignTechnicianRequest {
  technicianId: string | null;
  commissionPercent?: number | null;
  clearCommissionOverride?: boolean;
}

export interface CommissionItemDetail {
  serviceOrderId: string;
  itemId: string;
  itemTag: string;
  applianceDisplayName: string;
  deliveredAt: string | null;
  laborCost: number;
  totalPrice: number;
  netProfit: number;
  commissionPercent: number;
  commissionAmount: number;
}

export interface TechnicianCommissionRow {
  technicianId: string;
  technicianName: string;
  role: Role | null;
  defaultCommissionPercent: number;
  deliveredItemsCount: number;
  totalLabor: number;
  totalRevenue: number;
  totalNetProfit: number;
  commissionTotal: number;
  items: CommissionItemDetail[];
}

export interface MonthlyCommissionReportResponse {
  periodStart: string;
  periodEnd: string;
  zone: string;
  technicianAssignmentEnabled: boolean;
  commissionBasis: CommissionBasis;
  deliveredWithTechnicianCount: number;
  deliveredUnassignedCount: number;
  totalCommissionableRevenue: number;
  totalCommissionAmount: number;
  technicians: TechnicianCommissionRow[];
}

export interface CreateWarrantyReturnRequest {
  reportedIssue: string;
  accessories?: string;
  notes?: string;
}

export interface QuoteOptionRequest {
  label: string;
  description?: string;
  laborCost: number;
  partsCost: number;
  partsCostActual?: number;
  discount?: number;
  warrantyDays?: number;
  recommended?: boolean;
}

export interface QuoteOptionResponse {
  id: string;
  optionIndex: number;
  label: string;
  description: string | null;
  laborCost: number;
  partsCost: number;
  partsCostActual: number;
  discount: number;
  totalPrice: number;
  estimatedNetProfit: number;
  warrantyDays: number;
  recommended: boolean;
}

export interface UpdateItemQuoteRequest {
  technicalDiagnosis?: string;
  laborCost: number;
  partsCost: number;
  partsCostActual?: number;
  discount: number;
  warrantyDays?: number;
  quoteOptions?: QuoteOptionRequest[];
}

export interface PartCatalogResponse {
  id: string;
  name: string;
  applianceCategory: string | null;
  averageCost: number;
  suggestedPrice: number;
  unitProfit: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPartCatalogRequest {
  name: string;
  applianceCategory?: string;
  averageCost: number;
  suggestedPrice: number;
  notes?: string;
}

export interface PartRequestResponse {
  id: string;
  serviceOrderId: string;
  serviceOrderItemId: string;
  orderNumber: number;
  itemIndex: number;
  itemTag: string;
  itemStatus: ItemStatus;
  applianceDisplayName: string;
  customerName: string | null;
  partCatalogId: string | null;
  partName: string;
  quantity: number;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
  actualUnitCost: number | null;
  effectiveTotalCost: number;
  supplierName: string | null;
  purchaseUrl: string | null;
  notes: string | null;
  status: PartRequestStatus;
  expenseRecorded: boolean;
  orderedAt: string | null;
  arrivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartRequestSummaryResponse {
  toOrderCount: number;
  orderedCount: number;
  arrivedCount: number;
  estimatedToOrderCost: number;
  estimatedOrderedCost: number;
}

export interface CreatePartRequestRequest {
  partCatalogId?: string;
  partName?: string;
  quantity?: number;
  estimatedUnitCost?: number;
  supplierName?: string;
  purchaseUrl?: string;
  notes?: string;
  moveItemToWaitingParts?: boolean;
}

export interface UpdatePartRequestRequest {
  partName: string;
  quantity?: number;
  estimatedUnitCost?: number;
  actualUnitCost?: number;
  supplierName?: string;
  purchaseUrl?: string;
  notes?: string;
}

export interface MarkPartOrderedRequest {
  supplierName?: string;
  purchaseUrl?: string;
  actualUnitCost?: number;
  notes?: string;
}

export interface ArrivePartRequestRequest {
  actualUnitCost?: number;
  addToItemPartsCost?: boolean;
  moveItemToInRepair?: boolean;
  recordExpense?: boolean;
  paymentMethod?: OrderPaymentMethod;
}

export interface RepairProfitabilityResponse {
  periodStart: string;
  periodEnd: string;
  zone: string;
  deliveredItemsCount: number;
  itemsWithPartsCostCount: number;
  totalRevenue: number;
  totalPartsCostActual: number;
  estimatedNetProfit: number;
  profitMarginPercent: number;
}

export interface WorkshopAnalyticsResponse {
  periodStart: string;
  periodEnd: string;
  zone: string;
  quotesSentCount: number;
  quotesApprovedCount: number;
  quotesRejectedCount: number;
  quotesPendingCount: number;
  quoteApprovalRatePercent: number | null;
  avgIntakeToQuoteHours: number | null;
  intakeToQuoteSampleSize: number;
  avgApprovalToReadyHours: number | null;
  approvalToReadySampleSize: number;
  avgTotalTurnaroundHours: number | null;
  deliveredItemsCount: number;
  paidRepairsCount: number;
  totalRevenue: number;
  totalPartsCostActual: number;
  netRepairProfit: number;
  netProfitMarginPercent: number;
  averageTicket: number;
  itemsReceivedCount: number;
  warrantyReturnsCount: number;
  warrantyReturnRatePercent: number;
  overdueActiveCount: number;
  awaitingQuoteCount: number;
  awaitingApprovalCount: number;
  waitingPartsCount: number;
  readyForPickupCount: number;
}

export interface TransitionItemStatusRequest {
  status: ItemStatus;
  cancellationReason?: string;
  quoteOptionId?: string;
}

export interface PaymentPartRequest {
  paymentMethod: OrderPaymentMethod;
  amount: number;
}

export interface DeliverItemRequest {
  payments?: PaymentPartRequest[];
  deliverySignatureSvg?: string;
  deliverySignerName?: string;
}

export interface WhatsappLinkResponse {
  message: string;
  whatsappUrl: string;
}

export interface ItemPhotoResponse {
  id: string;
  serviceOrderItemId: string;
  storageKey: string;
  contentType: string;
  stage: PhotoStage;
  viewUrl: string;
  viewUrlExpiresAt: string;
  createdAt: string;
}

// Finance
export interface SupplierResponse {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface UpsertSupplierRequest {
  name: string;
  phone?: string;
  notes?: string;
}

export interface CreateFinancialTransactionRequest {
  type: TransactionType;
  category: TransactionCategory;
  serviceOrderItemId?: string;
  supplierId?: string;
  description: string;
  amount: number;
  paymentMethod: TransactionPaymentMethod;
  status?: TransactionStatus;
  dueDate?: string;
}

export interface FinancialTransactionResponse {
  id: string;
  tenantId: string;
  type: TransactionType;
  category: TransactionCategory;
  serviceOrderItemId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  description: string;
  amount: number;
  paymentMethod: TransactionPaymentMethod;
  status: TransactionStatus;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface FinancialSummaryResponse {
  periodStart: string;
  periodEnd: string;
  totalIncomePaid: number;
  totalExpensePaid: number;
  netBalance: number;
  totalPendingPayables: number;
  totalOverduePayables: number;
  incomeByPaymentMethod: Partial<Record<TransactionPaymentMethod, number>>;
  expenseByCategory: Partial<Record<TransactionCategory, number>>;
}

export interface DailyCashClosingResponse {
  date: string;
  zone: string;
  totalIncomePaid: number;
  totalExpensePaid: number;
  netCashFlow: number;
  incomeCount: number;
  expenseCount: number;
  incomeByPaymentMethod: Partial<Record<TransactionPaymentMethod, number>>;
  expenseByPaymentMethod: Partial<Record<TransactionPaymentMethod, number>>;
  transactions: FinancialTransactionResponse[];
}

export interface ItemPaymentSummaryResponse {
  paymentMethod: TransactionPaymentMethod;
  amount: number;
  paidAt: string;
}
