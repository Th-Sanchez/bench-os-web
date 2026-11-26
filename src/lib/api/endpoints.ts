import { apiRequest, bffAuthRequest } from './http';
import type {
  ArrivePartRequestRequest,
  ClientSession,
  CreateFinancialTransactionRequest,
  CreatePartRequestRequest,
  CreateServiceOrderRequest,
  CreateUserRequest,
  CreateWarrantyReturnRequest,
  CustomerResponse,
  DailyCashClosingResponse,
  DeliverItemRequest,
  FinancialSummaryResponse,
  FinancialTransactionResponse,
  ForgotPasswordRequest,
  ItemPaymentSummaryResponse,
  ItemPhotoResponse,
  ItemStatus,
  LoginRequest,
  MarkPartOrderedRequest,
  MessageResponse,
  OrderItemQueueResponse,
  PageResponse,
  PartCatalogResponse,
  PartRequestResponse,
  PartRequestStatus,
  PartRequestSummaryResponse,
  RegisterTenantRequest,
  RepairProfitabilityResponse,
  ResetPasswordRequest,
  ServiceOrderItemResponse,
  ServiceOrderResponse,
  SupplierResponse,
  TenantSettingsResponse,
  TransactionCategory,
  TransactionPaymentMethod,
  TransactionStatus,
  TransactionType,
  TransitionItemStatusRequest,
  UpdateItemQuoteRequest,
  UpdatePartRequestRequest,
  UpdateShopBrandingRequest,
  UpdateTenantSettingsRequest,
  UpsertCustomerRequest,
  UpsertPartCatalogRequest,
  UpsertSupplierRequest,
  UserResponse,
  WhatsappLinkResponse,
  WhatsappMessageStage,
} from '@/lib/types/api';

export interface SessionStatusResponse {
  authenticated: boolean;
  session: ClientSession | null;
}

export const authApi = {
  session: () => bffAuthRequest<SessionStatusResponse>('session'),

  login: (payload: LoginRequest) =>
    bffAuthRequest<ClientSession>('login', { method: 'POST', body: payload }),

  register: (payload: RegisterTenantRequest) =>
    bffAuthRequest<ClientSession>('register', { method: 'POST', body: payload }),

  logout: () => bffAuthRequest<{ ok: boolean }>('logout', { method: 'POST' }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    bffAuthRequest<MessageResponse>('forgot-password', { method: 'POST', body: payload }),

  resetPassword: (payload: ResetPasswordRequest) =>
    bffAuthRequest<MessageResponse>('reset-password', { method: 'POST', body: payload }),
};

export const usersApi = {
  me: () => apiRequest<UserResponse>('/api/v1/users/me'),
  list: () => apiRequest<UserResponse[]>('/api/v1/users'),
  create: (payload: CreateUserRequest) =>
    apiRequest<UserResponse>('/api/v1/users', { method: 'POST', body: payload }),
  updateStatus: (id: string, active: boolean) =>
    apiRequest<UserResponse>(`/api/v1/users/${id}/status`, { method: 'PATCH', body: { active } }),
  resetPassword: (id: string, newPassword: string) =>
    apiRequest<UserResponse>(`/api/v1/users/${id}/password`, {
      method: 'PATCH',
      body: { newPassword },
    }),
};

export const tenantSettingsApi = {
  get: () => apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings'),
  update: (payload: UpdateTenantSettingsRequest) =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings', { method: 'PUT', body: payload }),
  addApplianceType: (name: string) =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/appliance-types', {
      method: 'POST',
      body: { name },
    }),
  removeApplianceType: (name: string) =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/appliance-types', {
      method: 'DELETE',
      query: { name },
    }),
  updateIntakeChecklists: (templates: Record<string, string[]>) =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/intake-checklists', {
      method: 'PUT',
      body: { templates },
    }),
  resetIntakeChecklists: () =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/intake-checklists', {
      method: 'DELETE',
    }),
  updateBranding: (payload: UpdateShopBrandingRequest) =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/branding', {
      method: 'PUT',
      body: payload,
    }),
  updateCareTips: (templates: Record<string, string[]>) =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/care-tips', {
      method: 'PUT',
      body: { templates },
    }),
  resetCareTips: () =>
    apiRequest<TenantSettingsResponse>('/api/v1/tenant/settings/care-tips', {
      method: 'DELETE',
    }),
};

export const customersApi = {
  search: (query?: string) =>
    apiRequest<CustomerResponse[]>('/api/v1/customers', { query: { query } }),
  get: (id: string) => apiRequest<CustomerResponse>(`/api/v1/customers/${id}`),
  create: (payload: UpsertCustomerRequest) =>
    apiRequest<CustomerResponse>('/api/v1/customers', { method: 'POST', body: payload }),
  update: (id: string, payload: UpsertCustomerRequest) =>
    apiRequest<CustomerResponse>(`/api/v1/customers/${id}`, { method: 'PUT', body: payload }),
  remove: (id: string) =>
    apiRequest<void>(`/api/v1/customers/${id}`, { method: 'DELETE' }),
};

export const ordersApi = {
  create: (payload: CreateServiceOrderRequest) =>
    apiRequest<ServiceOrderResponse>('/api/v1/orders', { method: 'POST', body: payload }),

  list: (params?: {
    orderNumber?: number;
    customerId?: string;
    status?: ItemStatus;
    page?: number;
    size?: number;
  }) => apiRequest<PageResponse<ServiceOrderResponse>>('/api/v1/orders', { query: params }),

  get: (id: string) => apiRequest<ServiceOrderResponse>(`/api/v1/orders/${id}`),

  getByToken: (publicToken: string) =>
    apiRequest<ServiceOrderResponse>(`/api/v1/orders/by-token/${publicToken}`),

  getProfitability: (params?: { from?: string; to?: string; zone?: string }) =>
    apiRequest<RepairProfitabilityResponse>('/api/v1/orders/profitability', { query: params }),

  listBenchQueue: (params?: {
    status?: ItemStatus[];
    tag?: string;
    page?: number;
    size?: number;
  }) => apiRequest<PageResponse<OrderItemQueueResponse>>('/api/v1/order-items', { query: params }),

  listAbandonmentEligible: (params?: { page?: number; size?: number }) =>
    apiRequest<PageResponse<OrderItemQueueResponse>>('/api/v1/order-items/abandonment-eligible', {
      query: params,
    }),

  updateQuote: (orderId: string, itemId: string, payload: UpdateItemQuoteRequest) =>
    apiRequest<ServiceOrderItemResponse>(`/api/v1/orders/${orderId}/items/${itemId}/quote`, {
      method: 'PATCH',
      body: payload,
    }),

  transitionStatus: (orderId: string, itemId: string, payload: TransitionItemStatusRequest) =>
    apiRequest<ServiceOrderItemResponse>(`/api/v1/orders/${orderId}/items/${itemId}/status`, {
      method: 'POST',
      body: payload,
    }),

  deliverItem: (orderId: string, itemId: string, payload?: DeliverItemRequest) =>
    apiRequest<ServiceOrderItemResponse>(`/api/v1/orders/${orderId}/items/${itemId}/deliver`, {
      method: 'POST',
      body: payload ?? {},
    }),

  openWarrantyReturn: (orderId: string, itemId: string, payload: CreateWarrantyReturnRequest) =>
    apiRequest<ServiceOrderResponse>(`/api/v1/orders/${orderId}/items/${itemId}/warranty-return`, {
      method: 'POST',
      body: payload,
    }),

  getOrderWhatsappLink: (orderId: string, stage?: WhatsappMessageStage) =>
    apiRequest<WhatsappLinkResponse>(`/api/v1/orders/${orderId}/whatsapp-link`, {
      query: stage ? { stage } : undefined,
    }),

  getWhatsappLink: (orderId: string, itemId: string) =>
    apiRequest<WhatsappLinkResponse>(`/api/v1/orders/${orderId}/items/${itemId}/whatsapp-link`),
};

export const partsCatalogApi = {
  list: (params?: { query?: string; category?: string }) =>
    apiRequest<PartCatalogResponse[]>('/api/v1/parts-catalog', { query: params }),

  create: (payload: UpsertPartCatalogRequest) =>
    apiRequest<PartCatalogResponse>('/api/v1/parts-catalog', { method: 'POST', body: payload }),

  update: (id: string, payload: UpsertPartCatalogRequest) =>
    apiRequest<PartCatalogResponse>(`/api/v1/parts-catalog/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  remove: (id: string) =>
    apiRequest<void>(`/api/v1/parts-catalog/${id}`, { method: 'DELETE' }),

  seedDefaults: () =>
    apiRequest<PartCatalogResponse[]>('/api/v1/parts-catalog/seed-defaults', { method: 'POST' }),
};

export const partRequestsApi = {
  listForItem: (orderId: string, itemId: string) =>
    apiRequest<PartRequestResponse[]>(`/api/v1/orders/${orderId}/items/${itemId}/part-requests`),

  createForItem: (orderId: string, itemId: string, payload: CreatePartRequestRequest) =>
    apiRequest<PartRequestResponse>(`/api/v1/orders/${orderId}/items/${itemId}/part-requests`, {
      method: 'POST',
      body: payload,
    }),

  listQueue: (params?: {
    status?: PartRequestStatus[];
    query?: string;
    page?: number;
    size?: number;
  }) =>
    apiRequest<PageResponse<PartRequestResponse>>('/api/v1/part-requests', { query: params }),

  getSummary: () => apiRequest<PartRequestSummaryResponse>('/api/v1/part-requests/summary'),

  update: (id: string, payload: UpdatePartRequestRequest) =>
    apiRequest<PartRequestResponse>(`/api/v1/part-requests/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  markOrdered: (id: string, payload?: MarkPartOrderedRequest) =>
    apiRequest<PartRequestResponse>(`/api/v1/part-requests/${id}/order`, {
      method: 'POST',
      body: payload ?? {},
    }),

  reopen: (id: string) =>
    apiRequest<PartRequestResponse>(`/api/v1/part-requests/${id}/reopen`, {
      method: 'POST',
    }),

  markArrived: (id: string, payload?: ArrivePartRequestRequest) =>
    apiRequest<PartRequestResponse>(`/api/v1/part-requests/${id}/arrive`, {
      method: 'POST',
      body: payload ?? {},
    }),

  remove: (id: string) =>
    apiRequest<void>(`/api/v1/part-requests/${id}`, { method: 'DELETE' }),
};

export const photosApi = {
  list: (orderId: string, itemId: string) =>
    apiRequest<ItemPhotoResponse[]>(`/api/v1/orders/${orderId}/items/${itemId}/photos`),
};

export const financeApi = {
  getSummary: (params?: { from?: string; to?: string }) =>
    apiRequest<FinancialSummaryResponse>('/api/v1/finance/summary', { query: params }),

  getDailyClosing: (params?: { date?: string; zone?: string }) =>
    apiRequest<DailyCashClosingResponse>('/api/v1/finance/daily-closing', { query: params }),

  listTransactions: (params?: {
    type?: TransactionType;
    category?: TransactionCategory;
    status?: TransactionStatus;
    paymentMethod?: TransactionPaymentMethod;
    supplierId?: string;
    from?: string;
    to?: string;
    overdueOnly?: boolean;
    page?: number;
    size?: number;
  }) =>
    apiRequest<PageResponse<FinancialTransactionResponse>>('/api/v1/finance/transactions', {
      query: params,
    }),

  createTransaction: (payload: CreateFinancialTransactionRequest) =>
    apiRequest<FinancialTransactionResponse>('/api/v1/finance/transactions', {
      method: 'POST',
      body: payload,
    }),

  payTransaction: (id: string, paymentMethod?: TransactionPaymentMethod) =>
    apiRequest<FinancialTransactionResponse>(`/api/v1/finance/transactions/${id}/pay`, {
      method: 'POST',
      body: paymentMethod ? { paymentMethod } : {},
    }),

  listSuppliers: (query?: string) =>
    apiRequest<SupplierResponse[]>('/api/v1/finance/suppliers', { query: { query } }),

  createSupplier: (payload: UpsertSupplierRequest) =>
    apiRequest<SupplierResponse>('/api/v1/finance/suppliers', { method: 'POST', body: payload }),

  updateSupplier: (id: string, payload: UpsertSupplierRequest) =>
    apiRequest<SupplierResponse>(`/api/v1/finance/suppliers/${id}`, { method: 'PUT', body: payload }),

  deleteSupplier: (id: string) =>
    apiRequest<void>(`/api/v1/finance/suppliers/${id}`, { method: 'DELETE' }),

  listItemPayments: (itemId: string) =>
    apiRequest<ItemPaymentSummaryResponse[]>(`/api/v1/finance/order-items/${itemId}/payments`),
};
