'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  FileText,
  MessageCircle,
  Pencil,
  PenTool,
  Printer,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { DeliverSplitModal } from '@/components/orders/DeliverSplitModal';
import { ItemPartRequestsCard } from '@/components/orders/ItemPartRequestsCard';
import { QuoteEditModal } from '@/components/orders/QuoteEditModal';
import { toSignatureDataUri } from '@/components/orders/SignaturePad';
import { WarrantyReturnModal } from '@/components/orders/WarrantyReturnModal';
import { WhatsappStageModal } from '@/components/orders/WhatsappStageModal';
import { PrintableOrderLabels, PrintableWarrantyReceipt } from '@/components/print/PrintViews';
import {
  Button,
  Card,
  Field,
  Modal,
  Spinner,
  StatusBadge,
  TagBadge,
  WarrantyBadge,
  inputClassName,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { financeApi, ordersApi, photosApi, tenantSettingsApi, usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { usePrintPreferences } from '@/lib/settings/PrintPreferencesContext';
import type { ItemPaymentSummaryResponse, ItemStatus } from '@/lib/types/api';
import { formatBRL, formatDate, formatDateTime, maskPhoneBR } from '@/lib/utils/masks';
import {
  canDeliverItem,
  canEditQuote,
  canEditQuoteForStatus,
  canTransitionToStatus,
  getValidNextStatuses,
  getWarrantyRemainingDays,
} from '@/lib/utils/permissions';

const TRACKING_BASE = (
  process.env.NEXT_PUBLIC_TRACKING_BASE_URL || 'http://localhost:8080/track'
).replace(/\/+$/, '');

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const searchParams = useSearchParams();
  const initialItemId = searchParams.get('item');
  const initialAction = searchParams.get('action');

  const { locale, t } = useI18n();
  const { session } = useAuth();
  const { labelFormat } = usePrintPreferences();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId);
  const [quoteModalOpen, setQuoteModalOpen] = useState(initialAction === 'quote');
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'none' | 'labels' | 'receipt'>('none');
  const [paymentsByItem, setPaymentsByItem] = useState<Record<string, ItemPaymentSummaryResponse[]>>({});

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
  });

  const settingsQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantSettingsApi.get(),
  });

  const order = orderQuery.data;

  const activeItem =
    order?.items.find((i) => i.id === selectedItemId) ?? order?.items[0] ?? null;

  const photosQuery = useQuery({
    queryKey: ['item-photos', orderId, activeItem?.id],
    queryFn: () => photosApi.list(orderId, activeItem!.id),
    enabled: Boolean(activeItem),
  });

  const itemPaymentsQuery = useQuery({
    queryKey: ['item-payments', activeItem?.id],
    queryFn: () => financeApi.listItemPayments(activeItem!.id),
    enabled: Boolean(activeItem && activeItem.status === 'DELIVERED'),
  });

  const showTechnicianBlock =
    Boolean(settingsQuery.data?.technicianAssignmentEnabled) ||
    Boolean(activeItem?.assignedTechnicianId);

  const techniciansQuery = useQuery({
    queryKey: ['assignable-technicians'],
    queryFn: () => usersApi.listTechnicians(),
    enabled: showTechnicianBlock,
  });

  const assignTechMutation = useMutation({
    mutationFn: ({
      technicianId,
      commissionPercent,
      clearCommissionOverride,
    }: {
      technicianId: string | null;
      commissionPercent?: number | null;
      clearCommissionOverride?: boolean;
    }) =>
      ordersApi.assignTechnician(orderId, activeItem!.id, {
        technicianId,
        commissionPercent,
        clearCommissionOverride,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['finance', 'commissions'] }),
      ]);
      toast.success(
        locale === 'en' ? 'Responsible technician updated' : 'Técnico responsável atualizado!'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ status, cancellationReason }: { status: ItemStatus; cancellationReason?: string }) =>
      ordersApi.transitionStatus(orderId, activeItem!.id, { status, cancellationReason }),
    onSuccess: async (_, variables) => {
      setCancelModalOpen(false);
      setCancelReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      toast.success(`#${activeItem?.tag} → ${t.status[variables.status]}`);
    },
    onError: async (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        toast.warning(t.common.conflictReload, err.message);
        await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      } else {
        toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
      }
    },
  });

  async function triggerPrint(mode: 'labels' | 'receipt') {
    if (!order) return;
    if (mode === 'receipt') {
      const delivered = order.items.filter((i) => i.status === 'DELIVERED');
      const entries = await Promise.all(
        delivered.map(async (item) => {
          try {
            const list = await financeApi.listItemPayments(item.id);
            return [item.id, list] as const;
          } catch {
            return [item.id, [] as ItemPaymentSummaryResponse[]] as const;
          }
        })
      );
      setPaymentsByItem(Object.fromEntries(entries));
    }
    setPrintMode(mode);
    window.setTimeout(() => {
      window.print();
    }, 180);
  }

  async function copyTrackingUrl() {
    if (!order) return;
    await navigator.clipboard.writeText(`${TRACKING_BASE}/${order.publicToken}`);
    toast.success(t.common.copied, `${TRACKING_BASE}/${order.publicToken}`);
  }

  if (orderQuery.isLoading) {
    return <Spinner label={t.common.loading} />;
  }

  if (!order || !activeItem) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-600">{t.common.noResults}</p>
        <Link href="/orders" className="mt-4 inline-block">
          <Button variant="outline">{t.common.back}</Button>
        </Link>
      </Card>
    );
  }

  const role = session?.user.role;
  const warranty = getWarrantyRemainingDays(activeItem);
  const validNext = getValidNextStatuses(activeItem.status, {
    warrantyReturn: activeItem.warrantyReturn,
    totalPrice: activeItem.totalPrice,
  }).filter((target) => canTransitionToStatus(role, target));

  const quickMoveTargets = validNext.filter(
    (s) => s !== 'DELIVERED' && s !== 'DISCARDED' && s !== 'CANCELLED'
  );
  const canCancel = validNext.includes('CANCELLED');
  const canQuoteNow = canEditQuote(role) && canEditQuoteForStatus(activeItem.status);

  return (
    <>
      <div className="no-print space-y-5">
        {/* Top Bar */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link href="/orders">
              <Button variant="outline" size="sm" className="mt-0.5">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  OS <span className="font-mono">#{order.orderNumber}</span>
                </h1>
                <span className="text-xs text-slate-500">
                  {formatDateTime(order.createdAt, locale)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <Link
                  href={`/customers/${order.customerId}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-blue-600"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  {order.customerName ?? 'Cliente'}
                </Link>
                {order.customerPhone && (
                  <span className="font-mono text-xs text-slate-500">
                    {maskPhoneBR(order.customerPhone)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyTrackingUrl}>
              <Copy className="h-3.5 w-3.5" />
              Link /track
            </Button>
            {labelFormat !== 'DISABLED' && (
              <Button variant="outline" size="sm" onClick={() => void triggerPrint('labels')}>
                <Tag className="h-3.5 w-3.5" />
                {locale === 'en' ? 'Print Labels' : 'Etiquetas QR'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void triggerPrint('receipt')}>
              <Printer className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Warranty Receipt' : 'Comprovante A4'}
            </Button>
            <Button variant="success" size="sm" onClick={() => setWhatsappModalOpen(true)}>
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Item Tabs */}
        <div className="flex flex-wrap gap-2">
          {order.items.map((item) => {
            const active = item.id === activeItem.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                  active
                    ? 'border-blue-600 bg-white shadow-xs ring-2 ring-blue-500/15'
                    : 'border-slate-200 bg-white/70 hover:bg-white'
                }`}
              >
                <TagBadge tag={item.tag} dark={active} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    {item.applianceType} {item.brand}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <StatusBadge status={item.status} size="xs" />
                    {item.warrantyReturn && <WarrantyBadge />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Warranty Return Banner */}
        {activeItem.warrantyReturn && activeItem.parentOrderId && (
          <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-900">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-violet-700" />
              {locale === 'en'
                ? `Warranty Return · Reference #${activeItem.parentItemTag ?? ''}`
                : `Retorno em Garantia · Referência ao reparo #${activeItem.parentItemTag ?? ''}`}
            </div>
            <Link
              href={`/orders/${activeItem.parentOrderId}?item=${activeItem.parentItemId ?? ''}`}
              className="font-bold text-violet-700 hover:underline"
            >
              {locale === 'en' ? 'Open original order' : 'Ver reparo original'}
            </Link>
          </div>
        )}

        {/* Main 2-column Desktop Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left 7 columns: Technical details + Photos + Status Actions */}
          <div className="space-y-5 lg:col-span-7">
            <Card className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TagBadge tag={activeItem.tag} />
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    {activeItem.applianceType} · {activeItem.brand}
                  </h2>
                  {activeItem.model && (
                    <span className="text-sm text-slate-500">{activeItem.model}</span>
                  )}
                </div>
                <StatusBadge status={activeItem.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-500">{locale === 'en' ? 'Voltage' : 'Voltagem'}</span>
                  <p className="mt-0.5 font-mono font-bold text-slate-900">
                    {t.voltage[activeItem.voltage]}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{locale === 'en' ? 'Serial' : 'Nº Série'}</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-800">
                    {activeItem.serialNumber || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{locale === 'en' ? 'Estimated' : 'Previsão'}</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-800">
                    {formatDate(activeItem.estimatedCompletionDate, locale)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{locale === 'en' ? 'Warranty' : 'Garantia'}</span>
                  <p className="mt-0.5 font-mono font-semibold text-slate-800">
                    {activeItem.warrantyDays}d
                    {activeItem.status === 'DELIVERED' && warranty.active && (
                      <span className="ml-1 text-emerald-700">({warranty.remainingDays}d)</span>
                    )}
                  </p>
                </div>
              </div>

              {showTechnicianBlock && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-slate-700">
                      {locale === 'en' ? 'Responsible Technician' : 'Técnico Responsável'}
                    </span>
                  </div>

                  {activeItem.status === 'DELIVERED' ||
                  activeItem.status === 'DISCARDED' ||
                  activeItem.status === 'CANCELLED' ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {activeItem.assignedTechnicianName ||
                          (locale === 'en' ? 'Unassigned' : 'Não atribuído')}
                      </span>
                      {role === 'OWNER' && activeItem.commissionAmount != null && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                          {locale === 'en' ? 'Commission' : 'Comissão'}:{' '}
                          {formatBRL(activeItem.commissionAmount, locale)}
                          {activeItem.commissionPercent != null
                            ? ` (${activeItem.commissionPercent.toFixed(1)}%)`
                            : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={activeItem.assignedTechnicianId ?? ''}
                        disabled={assignTechMutation.isPending}
                        onChange={(e) =>
                          assignTechMutation.mutate({
                            technicianId: e.target.value || null,
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        <option value="">
                          {locale === 'en' ? '— Unassigned —' : '— Sem técnico —'}
                        </option>
                        {(techniciansQuery.data ?? []).map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>

                      {role === 'OWNER' && activeItem.assignedTechnicianId && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">%</span>
                          <input
                            key={`${activeItem.id}-${activeItem.commissionPercent ?? 'default'}`}
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            defaultValue={
                              activeItem.commissionPercent != null
                                ? String(activeItem.commissionPercent)
                                : ''
                            }
                            placeholder={locale === 'en' ? 'Default' : 'Padrão'}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              if (!raw) {
                                if (activeItem.commissionPercent != null) {
                                  assignTechMutation.mutate({
                                    technicianId: activeItem.assignedTechnicianId ?? null,
                                    clearCommissionOverride: true,
                                  });
                                }
                                return;
                              }
                              const num = Number.parseFloat(raw.replace(',', '.'));
                              if (
                                Number.isFinite(num) &&
                                num >= 0 &&
                                num <= 100 &&
                                num !== activeItem.commissionPercent
                              ) {
                                assignTechMutation.mutate({
                                  technicianId: activeItem.assignedTechnicianId ?? null,
                                  commissionPercent: num,
                                });
                              }
                            }}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {locale === 'en' ? 'Reported issue' : 'Defeito relatado'}
                  </p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
                    {activeItem.reportedIssue}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {locale === 'en' ? 'Technical diagnosis' : 'Diagnóstico técnico'}
                  </p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                    {activeItem.technicalDiagnosis ||
                      (locale === 'en' ? 'Not diagnosed yet.' : 'Ainda não preenchido.')}
                  </p>
                </div>

                {activeItem.accessories && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {locale === 'en' ? 'Accessories' : 'Acessórios'}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{activeItem.accessories}</p>
                  </div>
                )}

                {activeItem.intakeChecklist && activeItem.intakeChecklist.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {locale === 'en' ? 'Intake checklist' : 'Checklist de recebimento'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {activeItem.intakeChecklist.map((entry) => (
                        <span
                          key={entry.label}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            entry.checked
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <span>{entry.checked ? '✓' : '✕'}</span>
                          {entry.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeItem.cancellationReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    <strong>{locale === 'en' ? 'Cancellation reason:' : 'Motivo do cancelamento:'}</strong>{' '}
                    {activeItem.cancellationReason}
                  </div>
                )}
              </div>
            </Card>

            {/* Workflow Actions Card */}
            <Card className="p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900">
                {locale === 'en' ? 'Workflow Actions' : 'Ações da Etapa'}
              </h3>

              <div className="flex flex-wrap gap-2">
                {canDeliverItem(activeItem.status) && (
                  <Button
                    variant="success"
                    size="md"
                    onClick={() => setDeliverModalOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {locale === 'en' ? 'Register Delivery' : 'Registrar Entrega'}
                  </Button>
                )}

                {quickMoveTargets.map((target) => (
                  <Button
                    key={target}
                    variant={
                      target === 'READY_FOR_PICKUP'
                        ? 'success'
                        : target === 'APPROVED' && activeItem.warrantyReturn && activeItem.totalPrice === 0
                          ? 'primary'
                          : 'outline'
                    }
                    size="md"
                    loading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate({ status: target })}
                  >
                    {target === 'APPROVED' &&
                    activeItem.status === 'DIAGNOSING' &&
                    activeItem.warrantyReturn &&
                    activeItem.totalPrice === 0
                      ? locale === 'en'
                        ? 'Covered Warranty (R$ 0)'
                        : 'Coberto em Garantia (R$ 0)'
                      : t.status[target]}
                  </Button>
                ))}

                {activeItem.status === 'DELIVERED' && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setWarrantyModalOpen(true)}
                  >
                    <ShieldCheck className="h-4 w-4 text-violet-600" />
                    {locale === 'en' ? 'Open Warranty Return' : 'Abrir Retorno de Garantia'}
                  </Button>
                )}

                {canCancel && (
                  <Button
                    variant="ghost"
                    size="md"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelModalOpen(true)}
                  >
                    {locale === 'en' ? 'Cancel Item' : 'Cancelar Item'}
                  </Button>
                )}
              </div>
            </Card>

            {/* Required Parts Queue for this Item */}
            <ItemPartRequestsCard orderId={orderId} item={activeItem} />

            {/* Read-only Photo Gallery */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <Camera className="h-4 w-4 text-slate-400" />
                  {locale === 'en' ? 'Appliance Photos' : 'Fotos do Aparelho'} (
                  {photosQuery.data?.length ?? 0})
                </h3>
                <span className="text-[11px] text-slate-400">
                  {locale === 'en' ? 'Captured on mobile' : 'Registradas pelo app mobile'}
                </span>
              </div>

              {photosQuery.isLoading ? (
                <Spinner />
              ) : !photosQuery.data || photosQuery.data.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {locale === 'en'
                    ? 'No photos attached to this appliance yet.'
                    : 'Nenhuma foto anexada a este aparelho até o momento.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {photosQuery.data.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setLightboxUrl(photo.viewUrl)}
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-square"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.viewUrl}
                        alt={t.photoStage[photo.stage]}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t.photoStage[photo.stage]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right 5 columns: Quote & Profit Card + Payments + Order Notes */}
          <div className="space-y-5 lg:col-span-5">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'en' ? 'Quote & Margin' : 'Orçamento & Margem'}
                </h3>
                {canQuoteNow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuoteModalOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t.common.edit}
                  </Button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{locale === 'en' ? 'Labor' : 'Mão de obra'}</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatBRL(activeItem.laborCost, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{locale === 'en' ? 'Parts (billed)' : 'Peças (cliente)'}</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatBRL(activeItem.partsCost, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{locale === 'en' ? 'Discount' : 'Desconto'}</span>
                  <span className="font-mono font-semibold text-red-600">
                    - {formatBRL(activeItem.discount, locale)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span className="font-mono text-lg tabular-nums">
                    {formatBRL(activeItem.totalPrice, locale)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-900">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    {locale === 'en' ? 'Internal net margin' : 'Margem real (interno)'}
                  </span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatBRL(activeItem.estimatedNetProfit, locale)}
                  </span>
                </div>
                <p className="mt-1 text-emerald-800/80">
                  {locale === 'en' ? 'Actual parts cost:' : 'Custo real das peças:'}{' '}
                  <span className="font-mono font-semibold">
                    {formatBRL(activeItem.partsCostActual, locale)}
                  </span>
                </p>
              </div>
            </Card>

            {activeItem.status === 'DELIVERED' && (
              <Card className="p-5 space-y-3">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  {locale === 'en' ? 'Delivery & Payments' : 'Entrega & Pagamentos'}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === 'en' ? 'Delivered at:' : 'Entregue em:'}{' '}
                  <strong className="text-slate-800">
                    {formatDateTime(activeItem.deliveredAt, locale)}
                  </strong>
                </p>
                {itemPaymentsQuery.data && itemPaymentsQuery.data.length > 0 ? (
                  <div className="space-y-1.5">
                    {itemPaymentsQuery.data.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-slate-700">
                          {t.paymentMethod[p.paymentMethod]}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatBRL(p.amount, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {locale === 'en' ? 'No payment recorded (R$ 0.00).' : 'Sem cobrança registrada (R$ 0,00).'}
                  </p>
                )}

                {toSignatureDataUri(activeItem.deliverySignatureSvg) && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <PenTool className="h-3.5 w-3.5 text-blue-600" />
                      {locale === 'en' ? 'Pickup Signature' : 'Assinatura na Retirada'}
                    </p>
                    <div className="flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toSignatureDataUri(activeItem.deliverySignatureSvg)}
                        alt="Assinatura digital na retirada"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    {activeItem.deliverySignerName && (
                      <p className="text-xs text-slate-500">
                        {locale === 'en' ? 'Picked up by:' : 'Retirado por:'}{' '}
                        <strong className="text-slate-700">{activeItem.deliverySignerName}</strong>
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {order.customerRating != null && (
              <Card className="border-amber-200 bg-amber-50/40 p-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    {locale === 'en' ? 'Customer Rating' : 'Avaliação do Cliente'}
                  </h3>
                  <div className="flex items-center gap-0.5" aria-label={`${order.customerRating}/5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${
                          n <= (order.customerRating ?? 0)
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {order.customerFeedback ? (
                  <p className="rounded-lg border border-amber-200/80 bg-white p-3 text-sm italic text-slate-700">
                    &ldquo;{order.customerFeedback}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">
                    {locale === 'en'
                      ? `Customer rated ${order.customerRating}/5 stars on the public tracking page.`
                      : `Cliente avaliou com ${order.customerRating}/5 estrelas na página /track.`}
                  </p>
                )}
                {order.customerRatedAt && (
                  <p className="text-[11px] text-slate-500">
                    {formatDateTime(order.customerRatedAt, locale)}
                  </p>
                )}
              </Card>
            )}

            {order.notes && (
              <Card className="p-5 space-y-2">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'en' ? 'Order Notes' : 'Observações da OS'}
                </h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Print Views */}
      {printMode === 'labels' && (
        <PrintableOrderLabels
          order={order}
          tenant={session?.tenant ?? null}
          format={labelFormat === 'DISABLED' ? 'A4' : labelFormat}
        />
      )}
      {printMode === 'receipt' && (
        <PrintableWarrantyReceipt
          order={order}
          tenant={session?.tenant ?? null}
          settings={settingsQuery.data ?? null}
          paymentsByItem={paymentsByItem}
        />
      )}

      {/* Modals */}
      <QuoteEditModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        orderId={orderId}
        item={activeItem}
        defaultLaborCost={settingsQuery.data?.defaultLaborCost ?? 0}
      />

      <DeliverSplitModal
        open={deliverModalOpen}
        onClose={() => setDeliverModalOpen(false)}
        orderId={orderId}
        item={activeItem}
        customerName={order.customerName}
      />

      <WarrantyReturnModal
        open={warrantyModalOpen}
        onClose={() => setWarrantyModalOpen(false)}
        orderId={orderId}
        item={activeItem}
      />

      <WhatsappStageModal
        open={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        orderId={orderId}
        orderNumber={order.orderNumber}
      />

      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        size="sm"
        title={locale === 'en' ? `Cancel #${activeItem.tag}` : `Cancelar item #${activeItem.tag}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              {t.common.back}
            </Button>
            <Button
              variant="danger"
              disabled={!cancelReason.trim()}
              loading={transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate({
                  status: 'CANCELLED',
                  cancellationReason: cancelReason.trim(),
                })
              }
            >
              {locale === 'en' ? 'Confirm Cancellation' : 'Confirmar Cancelamento'}
            </Button>
          </>
        }
      >
        <Field label={locale === 'en' ? 'Reason' : 'Justificativa'} required>
          <textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Customer withdrew before diagnosis...'
                : 'Cliente desistiu antes do diagnóstico...'
            }
            className={inputClassName}
          />
        </Field>
      </Modal>

      {/* Photo Lightbox */}
      {lightboxUrl && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-5 top-5 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            aria-label="Fechar foto"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Foto ampliada"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
