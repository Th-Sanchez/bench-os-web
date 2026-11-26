'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Globe,
  ImagePlus,
  KeyRound,
  Lightbulb,
  PenTool,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Save,
  Shield,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Modal,
  Spinner,
  inputClassName,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { tenantSettingsApi, usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  mergeApplianceTypes,
  resolveChecklistForCategory,
} from '@/lib/constants/appliances';
import { useI18n } from '@/lib/i18n/I18nProvider';
import {
  usePrintPreferences,
  type LabelPrintFormat,
} from '@/lib/settings/PrintPreferencesContext';
import type { Role, UserResponse, WhatsappMessageStage } from '@/lib/types/api';
import {
  formatCurrencyInput,
  maskCurrencyBRL,
  maskInteger,
  parseCurrencyBRL,
} from '@/lib/utils/masks';
import { canManageShopSettings, canManageTeam } from '@/lib/utils/permissions';

const TEMPLATE_PLACEHOLDERS = [
  { api: '{customerName}', ptBr: '{nomeCliente}' },
  { api: '{appliances}', ptBr: '{aparelhos}' },
  { api: '{orderNumber}', ptBr: '{numeroOS}' },
  { api: '{totalPrice}', ptBr: '{valorTotal}' },
  { api: '{trackingUrl}', ptBr: '{linkAcompanhamento}' },
] as const;

const LEGACY_PLACEHOLDERS = [{ api: '{appliance}', ptBr: '{aparelho}' }] as const;

const DEFAULT_TEMPLATES_API: Record<WhatsappMessageStage, string> = {
  INTAKE:
    'Olá {customerName}! Registramos sua OS #{orderNumber}:\n{appliances}\nAcompanhe o andamento em tempo real: {trackingUrl}',
  QUOTE:
    'Olá {customerName}! Segue o orçamento da OS #{orderNumber}:\n{appliances}\nTotal: {totalPrice}\nAprove ou acompanhe por aqui: {trackingUrl}',
  READY:
    'Olá {customerName}! Seus aparelhos da OS #{orderNumber} estão prontos para retirada:\n{appliances}\nTotal: {totalPrice}\nDetalhes: {trackingUrl}',
};

function toDisplayTemplate(apiTemplate: string, locale: 'pt-BR' | 'en'): string {
  let result = apiTemplate;
  const allPairs = [...TEMPLATE_PLACEHOLDERS, ...LEGACY_PLACEHOLDERS];
  if (locale === 'pt-BR') {
    for (const pair of allPairs) {
      result = result.split(pair.api).join(pair.ptBr);
    }
  } else {
    for (const pair of allPairs) {
      result = result.split(pair.ptBr).join(pair.api);
    }
  }
  return result;
}

function toApiTemplate(displayTemplate: string): string {
  let result = displayTemplate;
  for (const pair of [...TEMPLATE_PLACEHOLDERS, ...LEGACY_PLACEHOLDERS]) {
    result = result.split(pair.ptBr).join(pair.api);
  }
  return result;
}

function resizeImageFileToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Navegador sem suporte a canvas.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const preferredMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        let dataUrl = canvas.toDataURL(preferredMime, 0.85);
        if (dataUrl.length > 220_000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { session } = useAuth();
  const { labelFormat, setLabelFormat } = usePrintPreferences();
  const toast = useToast();
  const queryClient = useQueryClient();

  const role = session?.user.role;
  const isOwnerRole = canManageShopSettings(role);
  const canTeam = canManageTeam(role);

  const settingsQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantSettingsApi.get(),
  });

  const teamQuery = useQuery({
    queryKey: ['team-users'],
    queryFn: () => usersApi.list(),
    enabled: canTeam,
  });

  // Operational settings draft overrides (null = fall back to server value)
  const [defaultLaborDraft, setDefaultLaborDraft] = useState<string | null>(null);
  const [defaultDaysDraft, setDefaultDaysDraft] = useState<string | null>(null);
  const [abandonmentDaysDraft, setAbandonmentDaysDraft] = useState<string | null>(null);
  const [waIntakeDraft, setWaIntakeDraft] = useState<string | null>(null);
  const [waQuoteDraft, setWaQuoteDraft] = useState<string | null>(null);
  const [waReadyDraft, setWaReadyDraft] = useState<string | null>(null);
  const [googleReviewUrlDraft, setGoogleReviewUrlDraft] = useState<string | null>(null);
  const [deliverySignatureDraft, setDeliverySignatureDraft] = useState<boolean | null>(null);
  const [pixKeyDraft, setPixKeyDraft] = useState<string | null>(null);
  const [pixReceiverNameDraft, setPixReceiverNameDraft] = useState<string | null>(null);
  const [pixReceiverCityDraft, setPixReceiverCityDraft] = useState<string | null>(null);
  const [logoDraft, setLogoDraft] = useState<string | null | undefined>(undefined);
  const [shopAddressDraft, setShopAddressDraft] = useState<string | null>(null);
  const [businessHoursDraft, setBusinessHoursDraft] = useState<string | null>(null);
  const [warrantyTermsDraft, setWarrantyTermsDraft] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [newApplianceType, setNewApplianceType] = useState('');
  const [selectedChecklistCategory, setSelectedChecklistCategory] = useState('Micro-ondas');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [selectedCareCategory, setSelectedCareCategory] = useState('Micro-ondas');
  const [newCareTip, setNewCareTip] = useState('');

  const serverSettings = settingsQuery.data;
  const defaultLaborInput =
    defaultLaborDraft ?? (serverSettings ? formatCurrencyInput(serverSettings.defaultLaborCost) : '');
  const defaultDays =
    defaultDaysDraft ?? (serverSettings ? String(serverSettings.defaultEstimatedDays) : '3');
  const abandonmentDays =
    abandonmentDaysDraft ?? (serverSettings ? String(serverSettings.abandonmentDays) : '180');
  const waIntake = toDisplayTemplate(
    waIntakeDraft ?? (serverSettings?.whatsappIntakeTemplate || DEFAULT_TEMPLATES_API.INTAKE),
    locale
  );
  const waQuote = toDisplayTemplate(
    waQuoteDraft ?? (serverSettings?.whatsappQuoteTemplate || DEFAULT_TEMPLATES_API.QUOTE),
    locale
  );
  const waReady = toDisplayTemplate(
    waReadyDraft ?? (serverSettings?.whatsappReadyTemplate || DEFAULT_TEMPLATES_API.READY),
    locale
  );
  const googleReviewUrl = googleReviewUrlDraft ?? (serverSettings?.googleReviewUrl ?? '');
  const deliverySignatureEnabled =
    deliverySignatureDraft ?? Boolean(serverSettings?.deliverySignatureEnabled);
  const pixKey = pixKeyDraft ?? (serverSettings?.pixKey ?? '');
  const pixReceiverName = pixReceiverNameDraft ?? (serverSettings?.pixReceiverName ?? '');
  const pixReceiverCity = pixReceiverCityDraft ?? (serverSettings?.pixReceiverCity ?? '');
  const currentLogoUrl = logoDraft !== undefined ? logoDraft : (serverSettings?.shopLogoDataUrl ?? null);
  const shopAddress = shopAddressDraft ?? (serverSettings?.shopAddress ?? '');
  const businessHours = businessHoursDraft ?? (serverSettings?.businessHours ?? '');
  const warrantyTerms = warrantyTermsDraft ?? (serverSettings?.warrantyTerms ?? '');

  const templateRefs = useRef<Record<WhatsappMessageStage, HTMLTextAreaElement | null>>({
    INTAKE: null,
    QUOTE: null,
    READY: null,
  });

  function insertPlaceholder(stage: WhatsappMessageStage, variable: string) {
    const currentValue =
      stage === 'INTAKE' ? waIntake : stage === 'QUOTE' ? waQuote : waReady;
    const setDraft =
      stage === 'INTAKE'
        ? setWaIntakeDraft
        : stage === 'QUOTE'
          ? setWaQuoteDraft
          : setWaReadyDraft;
    const el = templateRefs.current[stage];

    let nextValue: string;
    let nextCursor: number;

    if (el && document.activeElement === el) {
      const start = el.selectionStart ?? currentValue.length;
      const end = el.selectionEnd ?? currentValue.length;
      const before = currentValue.slice(0, start);
      const after = currentValue.slice(end);
      nextValue = `${before}${variable}${after}`;
      nextCursor = start + variable.length;
    } else {
      const sep =
        currentValue.length > 0 && !/[\s\n]$/.test(currentValue) ? ' ' : '';
      nextValue = `${currentValue}${sep}${variable}`;
      nextCursor = nextValue.length;
    }

    setDraft(nextValue);

    requestAnimationFrame(() => {
      const target = templateRefs.current[stage];
      if (target) {
        target.focus();
        target.setSelectionRange(nextCursor, nextCursor);
      }
    });
  }

  // Team modals
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState<Role>('TECHNICIAN');

  const [resetTarget, setResetTarget] = useState<UserResponse | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      tenantSettingsApi.update({
        defaultLaborCost: parseCurrencyBRL(defaultLaborInput),
        defaultEstimatedDays: Math.max(1, Number.parseInt(defaultDays, 10) || 3),
        abandonmentDays: Math.max(30, Number.parseInt(abandonmentDays, 10) || 180),
        whatsappIntakeTemplate: toApiTemplate(waIntake.trim()) || undefined,
        whatsappQuoteTemplate: toApiTemplate(waQuote.trim()),
        whatsappReadyTemplate: toApiTemplate(waReady.trim()) || undefined,
        googleReviewUrl: googleReviewUrl.trim(),
        deliverySignatureEnabled,
        pixKey: pixKey.trim(),
        pixReceiverName: pixReceiverName.trim(),
        pixReceiverCity: pixReceiverCity.trim(),
      }),
    onSuccess: async () => {
      setDefaultLaborDraft(null);
      setDefaultDaysDraft(null);
      setAbandonmentDaysDraft(null);
      setWaIntakeDraft(null);
      setWaQuoteDraft(null);
      setWaReadyDraft(null);
      setGoogleReviewUrlDraft(null);
      setDeliverySignatureDraft(null);
      setPixKeyDraft(null);
      setPixReceiverNameDraft(null);
      setPixReceiverCityDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success(locale === 'en' ? 'Settings saved' : 'Configurações salvas!');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const addApplianceMutation = useMutation({
    mutationFn: (name: string) => tenantSettingsApi.addApplianceType(name),
    onSuccess: async () => {
      setNewApplianceType('');
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success(locale === 'en' ? 'Appliance type added' : 'Tipo de aparelho adicionado');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const removeApplianceMutation = useMutation({
    mutationFn: (name: string) => tenantSettingsApi.removeApplianceType(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const checklistTemplates = useMemo(
    () => serverSettings?.intakeChecklistTemplates ?? {},
    [serverSettings?.intakeChecklistTemplates]
  );

  const checklistCategories = useMemo(
    () =>
      mergeApplianceTypes([
        ...(serverSettings?.customApplianceTypes ?? []),
        ...Object.keys(checklistTemplates),
      ]),
    [serverSettings?.customApplianceTypes, checklistTemplates]
  );

  const activeChecklistItems = useMemo(
    () => resolveChecklistForCategory(checklistTemplates, selectedChecklistCategory),
    [checklistTemplates, selectedChecklistCategory]
  );

  const updateChecklistsMutation = useMutation({
    mutationFn: (nextTemplates: Record<string, string[]>) =>
      tenantSettingsApi.updateIntakeChecklists(nextTemplates),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-settings'], updated);
      setNewChecklistItem('');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const resetChecklistsMutation = useMutation({
    mutationFn: () => tenantSettingsApi.resetIntakeChecklists(),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-settings'], updated);
      toast.success(
        locale === 'en' ? 'Default checklists restored' : 'Sugestões padrão restauradas!'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: () =>
      tenantSettingsApi.updateBranding({
        shopLogoDataUrl: logoDraft === undefined ? undefined : (logoDraft ?? undefined),
        clearLogo: logoDraft === null ? true : undefined,
        shopAddress: shopAddress.trim(),
        businessHours: businessHours.trim(),
        warrantyTerms: warrantyTerms.trim(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-settings'], updated);
      setLogoDraft(undefined);
      setShopAddressDraft(null);
      setBusinessHoursDraft(null);
      setWarrantyTermsDraft(null);
      toast.success(
        locale === 'en'
          ? 'Shop branding & terms saved!'
          : 'Identidade visual e termos salvos!'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  async function handleLogoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error(
        locale === 'en'
          ? 'Use a PNG, JPG or WebP image.'
          : 'Selecione uma imagem PNG, JPG ou WebP.'
      );
      return;
    }
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 256);
      setLogoDraft(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.errorGeneric);
    }
  }

  function mutateCategoryChecklist(nextItems: string[]) {
    const nextMap: Record<string, string[]> = {};
    const targetLower = selectedChecklistCategory.trim().toLowerCase();
    let replaced = false;
    for (const [key, items] of Object.entries(checklistTemplates)) {
      if (key.trim().toLowerCase() === targetLower) {
        nextMap[key] = nextItems;
        replaced = true;
      } else {
        nextMap[key] = items;
      }
    }
    if (!replaced) {
      nextMap[selectedChecklistCategory] = nextItems;
    }
    updateChecklistsMutation.mutate(nextMap);
  }

  function handleAddChecklistItem() {
    const trimmed = newChecklistItem.trim();
    if (!trimmed) return;
    if (activeChecklistItems.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setNewChecklistItem('');
      return;
    }
    mutateCategoryChecklist([...activeChecklistItems, trimmed]);
  }

  const careTipsTemplates = useMemo(
    () => serverSettings?.careTipsTemplates ?? {},
    [serverSettings?.careTipsTemplates]
  );

  const careTipCategories = useMemo(
    () =>
      mergeApplianceTypes([
        ...(serverSettings?.customApplianceTypes ?? []),
        ...Object.keys(careTipsTemplates),
      ]),
    [serverSettings?.customApplianceTypes, careTipsTemplates]
  );

  const activeCareTips = useMemo(
    () => resolveChecklistForCategory(careTipsTemplates, selectedCareCategory),
    [careTipsTemplates, selectedCareCategory]
  );

  const updateCareTipsMutation = useMutation({
    mutationFn: (nextTemplates: Record<string, string[]>) =>
      tenantSettingsApi.updateCareTips(nextTemplates),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-settings'], updated);
      setNewCareTip('');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const resetCareTipsMutation = useMutation({
    mutationFn: () => tenantSettingsApi.resetCareTips(),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-settings'], updated);
      toast.success(
        locale === 'en' ? 'Default care tips restored' : 'Dicas padrão restauradas!'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  function mutateCategoryCareTips(nextTips: string[]) {
    const nextMap: Record<string, string[]> = {};
    const targetLower = selectedCareCategory.trim().toLowerCase();
    let replaced = false;
    for (const [key, tips] of Object.entries(careTipsTemplates)) {
      if (key.trim().toLowerCase() === targetLower) {
        nextMap[key] = nextTips;
        replaced = true;
      } else {
        nextMap[key] = tips;
      }
    }
    if (!replaced) {
      nextMap[selectedCareCategory] = nextTips;
    }
    updateCareTipsMutation.mutate(nextMap);
  }

  function handleAddCareTip() {
    const trimmed = newCareTip.trim();
    if (!trimmed) return;
    if (activeCareTips.some((tip) => tip.toLowerCase() === trimmed.toLowerCase())) {
      setNewCareTip('');
      return;
    }
    mutateCategoryCareTips([...activeCareTips, trimmed]);
  }

  const createMemberMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        name: memberName.trim(),
        email: memberEmail.trim().toLowerCase(),
        password: memberPassword,
        role: memberRole,
      }),
    onSuccess: async () => {
      setCreateMemberOpen(false);
      setMemberName('');
      setMemberEmail('');
      setMemberPassword('');
      setMemberRole('TECHNICIAN');
      await queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success(locale === 'en' ? 'Team member added' : 'Membro da equipe cadastrado!');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      usersApi.updateStatus(id, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success(locale === 'en' ? 'User status updated' : 'Status do operador atualizado');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => usersApi.resetPassword(resetTarget!.id, resetNewPassword),
    onSuccess: () => {
      setResetTarget(null);
      setResetNewPassword('');
      toast.success(locale === 'en' ? 'Password updated' : 'Senha redefinida com sucesso!');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.settings}</h1>
        <p className="text-sm text-slate-500">
          {session?.tenant.name} · {session?.user.name} ({role ? t.role[role] : ''})
        </p>
      </div>

      {/* Workstation Preferences (All Roles) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
            <Printer className="h-4 w-4 text-blue-600" />
            {locale === 'en' ? 'Workstation Label Printing' : 'Impressão de Etiquetas neste PC'}
          </h2>
          <p className="text-xs text-slate-500">
            {locale === 'en'
              ? 'Choose default layout when printing QR Code labels from an order.'
              : 'Escolha o formato padrão ao imprimir etiquetas QR Code nas Ordens de Serviço.'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'DISABLED', label: locale === 'en' ? 'Disabled' : 'Desativado' },
                { value: 'A4', label: 'Papel A4 (2 col.)' },
                { value: 'THERMAL_58MM', label: 'Térmica 58mm' },
              ] as { value: LabelPrintFormat; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLabelFormat(opt.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  labelFormat === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
            <Globe className="h-4 w-4 text-blue-600" />
            {locale === 'en' ? 'Interface Language' : 'Idioma do Painel'}
          </h2>
          <p className="text-xs text-slate-500">
            {locale === 'en'
              ? 'Stored locally for this browser.'
              : 'Preferência salva localmente neste navegador.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLocale('pt-BR')}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                locale === 'pt-BR'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Português (Brasil)
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                locale === 'en'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              English (US)
            </button>
          </div>
        </Card>
      </div>

      {/* Shop Settings + WhatsApp Templates (OWNER only) */}
      {isOwnerRole && (
        <Card className="p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                {locale === 'en' ? 'Shop Operational Defaults & WhatsApp Templates' : 'Regras da Oficina & Templates de WhatsApp'}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === 'en'
                  ? 'Click any variable pill below a message to insert it at the cursor.'
                  : 'Clique nas variáveis abaixo de cada mensagem para inserir automaticamente no texto.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate()}
            >
              <Save className="h-3.5 w-3.5" />
              {t.common.save}
            </Button>
          </div>

          {settingsQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label={locale === 'en' ? 'Default labor cost (R$)' : 'Mão de obra padrão (R$)'}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={defaultLaborInput}
                    onChange={(e) => setDefaultLaborDraft(maskCurrencyBRL(e.target.value))}
                    className={`${inputClassName} font-mono`}
                  />
                </Field>
                <Field label={locale === 'en' ? 'Default turnaround (days)' : 'Prazo padrão após aprovação (dias)'}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={defaultDays}
                    onChange={(e) => setDefaultDaysDraft(maskInteger(e.target.value, 3))}
                    className={`${inputClassName} font-mono`}
                  />
                </Field>
                <Field label={locale === 'en' ? 'Abandonment threshold (days)' : 'Prazo para descarte (dias)'}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={abandonmentDays}
                    onChange={(e) => setAbandonmentDaysDraft(maskInteger(e.target.value, 3))}
                    className={`${inputClassName} font-mono`}
                  />
                </Field>
              </div>

              <Field
                label={
                  locale === 'en'
                    ? 'Google Business Review Link (optional)'
                    : 'Link de avaliação no Google (Google Meu Negócio)'
                }
                hint={
                  locale === 'en'
                    ? 'Customers who submit 5★ on the public /track page after delivery see a direct button to review your shop on Google.'
                    : 'Clientes que avaliarem com 5★ no /track após a entrega verão um botão direto para avaliar sua oficina no Google Maps.'
                }
              >
                <input
                  type="url"
                  maxLength={500}
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrlDraft(e.target.value)}
                  placeholder="https://g.page/r/.../review"
                  className={inputClassName}
                />
              </Field>

              <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 space-y-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <QrCode className="h-4 w-4 text-teal-700" />
                    {locale === 'en'
                      ? 'Direct Pix QR Code (Optional · Zero Fee)'
                      : 'QR Code Pix Direto para a Conta da Oficina (Opcional)'}
                  </div>
                  <p className="text-xs text-slate-600">
                    {locale === 'en'
                      ? 'Configure your Pix key to automatically generate a BR Code QR & Copy-Paste with the exact order value on /track and the delivery screen.'
                      : 'Informe a chave Pix da oficina para gerar QR Code e Copia e Cola com o valor exato na página /track (quando pronto) e na tela de entrega. Deixe em branco para desativar.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field
                    label={locale === 'en' ? 'Pix key' : 'Chave Pix'}
                    hint={
                      locale === 'en'
                        ? 'CPF/CNPJ (digits), e-mail, random key or phone with +55'
                        : 'CPF/CNPJ (só números), e-mail, chave aleatória ou celular com +55'
                    }
                  >
                    <input
                      type="text"
                      maxLength={77}
                      value={pixKey}
                      onChange={(e) => setPixKeyDraft(e.target.value)}
                      placeholder="12345678000199 ou +5511999998888"
                      className={`${inputClassName} font-mono`}
                    />
                  </Field>
                  <Field
                    label={locale === 'en' ? 'Receiver name (optional)' : 'Nome do recebedor (opcional)'}
                    hint={
                      locale === 'en'
                        ? 'Defaults to shop name (max 25 ASCII chars in BR Code)'
                        : 'Se vazio, usa o nome da oficina'
                    }
                  >
                    <input
                      type="text"
                      maxLength={60}
                      value={pixReceiverName}
                      onChange={(e) => setPixReceiverNameDraft(e.target.value)}
                      placeholder={session?.tenant.name ?? 'Oficina'}
                      className={inputClassName}
                    />
                  </Field>
                  <Field
                    label={locale === 'en' ? 'City (optional)' : 'Cidade (opcional)'}
                    hint={
                      locale === 'en'
                        ? 'Defaults to BRASIL'
                        : 'Se vazio, usa BRASIL'
                    }
                  >
                    <input
                      type="text"
                      maxLength={60}
                      value={pixReceiverCity}
                      onChange={(e) => setPixReceiverCityDraft(e.target.value)}
                      placeholder="Sao Paulo"
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <PenTool className="h-4 w-4 text-blue-600" />
                    {locale === 'en'
                      ? 'Digital Pickup Signature'
                      : 'Assinatura Digital na Retirada'}
                  </div>
                  <p className="text-xs text-slate-500">
                    {locale === 'en'
                      ? 'When enabled, displays an optional signature pad on the delivery screen (web & mobile) and embeds it in the warranty receipt.'
                      : 'Quando ativada, exibe o campo de assinatura na tela de entrega (web e app) para constar no comprovante e termo de garantia.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={deliverySignatureEnabled}
                  aria-label={
                    locale === 'en'
                      ? 'Toggle digital pickup signature'
                      : 'Ativar ou desativar assinatura digital na retirada'
                  }
                  onClick={() => setDeliverySignatureDraft(!deliverySignatureEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    deliverySignatureEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      deliverySignatureEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {(
                  [
                    {
                      stage: 'INTAKE' as WhatsappMessageStage,
                      label: locale === 'en' ? 'WhatsApp · Intake' : 'WhatsApp · Entrada',
                      value: waIntake,
                      onChange: setWaIntakeDraft,
                      required: false,
                    },
                    {
                      stage: 'QUOTE' as WhatsappMessageStage,
                      label: locale === 'en' ? 'WhatsApp · Quote' : 'WhatsApp · Orçamento',
                      value: waQuote,
                      onChange: setWaQuoteDraft,
                      required: true,
                    },
                    {
                      stage: 'READY' as WhatsappMessageStage,
                      label: locale === 'en' ? 'WhatsApp · Ready' : 'WhatsApp · Pronto para Retirada',
                      value: waReady,
                      onChange: setWaReadyDraft,
                      required: false,
                    },
                  ]
                ).map((tpl) => (
                  <div key={tpl.stage} className="space-y-2">
                    <Field label={tpl.label} required={tpl.required}>
                      <textarea
                        ref={(el) => {
                          templateRefs.current[tpl.stage] = el;
                        }}
                        rows={5}
                        value={tpl.value}
                        onChange={(e) => tpl.onChange(e.target.value)}
                        className={inputClassName}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_PLACEHOLDERS.map((pair) => {
                        const displayVar = locale === 'pt-BR' ? pair.ptBr : pair.api;
                        return (
                          <button
                            key={pair.api}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertPlaceholder(tpl.stage, displayVar)}
                            className="inline-flex items-center gap-0.5 rounded-md border border-blue-200 bg-blue-50/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98]"
                          >
                            <Plus className="h-3 w-3 shrink-0" />
                            {displayVar}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Shop Branding & Custom Warranty Terms (OWNER only) */}
      {isOwnerRole && (
        <Card className="p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
                <ImagePlus className="h-4 w-4 text-blue-600" />
                {locale === 'en'
                  ? 'Shop Branding, Address & Warranty Terms'
                  : 'Identidade Visual, Endereço & Termo de Garantia'}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === 'en'
                  ? 'Displayed to customers on /track, digital receipt, and printed A4 warranty certificate.'
                  : 'Exibido para o cliente na página /track, no comprovante digital e na impressão A4 da garantia.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={saveBrandingMutation.isPending}
              onClick={() => saveBrandingMutation.mutate()}
            >
              <Save className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Save branding' : 'Salvar identidade'}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Logo Picker */}
            <div className="space-y-3 lg:col-span-4">
              <p className="text-xs font-semibold text-slate-700">
                {locale === 'en' ? 'Workshop Logo (optional)' : 'Logo da Oficina (opcional)'}
              </p>
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                {currentLogoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentLogoUrl}
                    alt="Logo da oficina"
                    className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void handleLogoFileChange(e)}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {currentLogoUrl
                        ? locale === 'en'
                          ? 'Change'
                          : 'Trocar'
                        : locale === 'en'
                          ? 'Upload PNG/JPG'
                          : 'Enviar logo'}
                    </Button>
                    {currentLogoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setLogoDraft(null)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'en'
                      ? 'Auto-resized to 256×256 (PNG/JPG/WebP).'
                      : 'Redimensionada automaticamente (PNG, JPG ou WebP).'}
                  </p>
                </div>
              </div>
            </div>

            {/* Address, Hours & Custom Warranty Terms */}
            <div className="space-y-3.5 lg:col-span-8">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label={locale === 'en' ? 'Shop address (optional)' : 'Endereço da oficina (opcional)'}>
                  <input
                    type="text"
                    maxLength={300}
                    value={shopAddress}
                    onChange={(e) => setShopAddressDraft(e.target.value)}
                    placeholder="Ex.: Rua das Flores, 123 - Centro, São Paulo/SP"
                    className={inputClassName}
                  />
                </Field>
                <Field label={locale === 'en' ? 'Business hours (optional)' : 'Horário de atendimento (opcional)'}>
                  <input
                    type="text"
                    maxLength={200}
                    value={businessHours}
                    onChange={(e) => setBusinessHoursDraft(e.target.value)}
                    placeholder="Ex.: Seg a Sex 8h30–18h · Sáb 8h30–13h"
                    className={inputClassName}
                  />
                </Field>
              </div>
              <Field
                label={
                  locale === 'en'
                    ? 'Custom Warranty / Service Terms (optional)'
                    : 'Termo de Garantia / Serviço personalizado (opcional)'
                }
                hint={
                  locale === 'en'
                    ? 'Leave blank to use the standard BenchOS warranty clauses on receipts.'
                    : 'Deixe em branco para usar o termo padrão do BenchOS nos comprovantes.'
                }
              >
                <textarea
                  rows={4}
                  maxLength={3000}
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTermsDraft(e.target.value)}
                  placeholder={
                    locale === 'en'
                      ? '1. Warranty covers exclusively the repaired defect...'
                      : 'Ex.: 1. A garantia cobre exclusivamente o defeito consertado e as peças trocadas...\n2. Não cobre mau uso, quedas ou ligação em voltagem incorreta...'
                  }
                  className={inputClassName}
                />
              </Field>
            </div>
          </div>
        </Card>
      )}

      {/* Custom Appliance Types */}
      <Card className="p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
          <Tag className="h-4 w-4 text-blue-600" />
          {locale === 'en' ? 'Custom Appliance Types' : 'Tipos de Aparelho Customizados'}
        </h2>
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newApplianceType}
            onChange={(e) => setNewApplianceType(e.target.value)}
            placeholder={locale === 'en' ? 'e.g. Espresso Machine' : 'Ex.: Máquina de Café Expresso'}
            className={inputClassName}
          />
          <Button
            variant="outline"
            size="md"
            disabled={!newApplianceType.trim()}
            loading={addApplianceMutation.isPending}
            onClick={() => addApplianceMutation.mutate(newApplianceType.trim())}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {(settingsQuery.data?.customApplianceTypes ?? []).map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              {type}
              {isOwnerRole && (
                <button
                  type="button"
                  onClick={() => removeApplianceMutation.mutate(type)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remover ${type}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
          {(settingsQuery.data?.customApplianceTypes ?? []).length === 0 && (
            <p className="text-xs text-slate-400">
              {locale === 'en'
                ? 'Using the 18 built-in appliance categories.'
                : 'Usando as 18 categorias padrão de eletrodomésticos.'}
            </p>
          )}
        </div>
      </Card>

      {/* Intake Checklists by Appliance Category */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
              <ClipboardCheck className="h-4 w-4 text-blue-600" />
              {locale === 'en'
                ? 'Quick Intake Checklist by Category'
                : 'Checklist Rápido de Recebimento por Categoria'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {locale === 'en'
                ? 'Displayed when opening a new order to prevent forgotten accessories or aesthetic disputes.'
                : 'Aparece na abertura da OS para lembrar de itens críticos (ex.: retirar prato do micro-ondas) e registrar no /track.'}
            </p>
          </div>
          {isOwnerRole && (
            <Button
              variant="outline"
              size="sm"
              loading={resetChecklistsMutation.isPending}
              onClick={() => resetChecklistsMutation.mutate()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Restore defaults' : 'Restaurar padrões'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Field label={locale === 'en' ? 'Appliance category' : 'Categoria do aparelho'}>
              <select
                value={selectedChecklistCategory}
                onChange={(e) => setSelectedChecklistCategory(e.target.value)}
                className={inputClassName}
              >
                {checklistCategories.map((cat) => {
                  const count = resolveChecklistForCategory(checklistTemplates, cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {count > 0 ? `${cat} (${count})` : cat}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>

          <div className="space-y-3 lg:col-span-8">
            {isOwnerRole && (
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={160}
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder={
                    locale === 'en'
                      ? `Add checklist item for ${selectedChecklistCategory}...`
                      : `Novo item para ${selectedChecklistCategory} (ex.: Prato devolvido ao cliente)...`
                  }
                  className={inputClassName}
                />
                <Button
                  variant="outline"
                  size="md"
                  disabled={!newChecklistItem.trim()}
                  loading={updateChecklistsMutation.isPending}
                  onClick={handleAddChecklistItem}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {activeChecklistItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                {locale === 'en'
                  ? `No checklist items configured for ${selectedChecklistCategory}.`
                  : `Nenhum item de checklist configurado para ${selectedChecklistCategory}.`}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeChecklistItems.map((itemLabel) => (
                  <span
                    key={itemLabel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <span className="text-emerald-600">✓</span>
                    {itemLabel}
                    {isOwnerRole && (
                      <button
                        type="button"
                        disabled={updateChecklistsMutation.isPending}
                        onClick={() =>
                          mutateCategoryChecklist(
                            activeChecklistItems.filter((x) => x !== itemLabel)
                          )
                        }
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Remover ${itemLabel}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Post-Delivery Appliance Care Tips */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
              <Lightbulb className="h-4 w-4 text-emerald-600" />
              {locale === 'en'
                ? 'Post-Delivery Appliance Care Tips'
                : 'Dicas de Conservação Pós-Entrega (Manuais Rápidos)'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {locale === 'en'
                ? 'Shown automatically on /track and the digital receipt after delivery to help customers make their appliances last longer.'
                : 'Exibidas automaticamente no /track e no comprovante após a entrega para ensinar o cliente a conservar melhor o aparelho.'}
            </p>
          </div>
          {isOwnerRole && (
            <Button
              variant="outline"
              size="sm"
              loading={resetCareTipsMutation.isPending}
              onClick={() => resetCareTipsMutation.mutate()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Restore defaults' : 'Restaurar padrões'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Field label={locale === 'en' ? 'Appliance category' : 'Categoria do aparelho'}>
              <select
                value={selectedCareCategory}
                onChange={(e) => setSelectedCareCategory(e.target.value)}
                className={inputClassName}
              >
                {careTipCategories.map((cat) => {
                  const count = resolveChecklistForCategory(careTipsTemplates, cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {count > 0 ? `${cat} (${count})` : cat}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>

          <div className="space-y-3 lg:col-span-8">
            {isOwnerRole && (
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={240}
                  value={newCareTip}
                  onChange={(e) => setNewCareTip(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCareTip();
                    }
                  }}
                  placeholder={
                    locale === 'en'
                      ? `Add care tip for ${selectedCareCategory}...`
                      : `Nova dica para ${selectedCareCategory} (ex.: Ligue direto na tomada, sem adaptadores)...`
                  }
                  className={inputClassName}
                />
                <Button
                  variant="outline"
                  size="md"
                  disabled={!newCareTip.trim()}
                  loading={updateCareTipsMutation.isPending}
                  onClick={handleAddCareTip}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {activeCareTips.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                {locale === 'en'
                  ? `No care tips configured for ${selectedCareCategory}.`
                  : `Nenhuma dica configurada para ${selectedCareCategory}.`}
              </p>
            ) : (
              <ul className="space-y-2">
                {activeCareTips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-xs text-slate-700"
                  >
                    <span className="leading-relaxed">• {tip}</span>
                    {isOwnerRole && (
                      <button
                        type="button"
                        disabled={updateCareTipsMutation.isPending}
                        onClick={() =>
                          mutateCategoryCareTips(activeCareTips.filter((x) => x !== tip))
                        }
                        className="shrink-0 text-slate-400 hover:text-red-600"
                        aria-label={`Remover dica`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Team Management (OWNER only) */}
      {canTeam && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h2 className="font-display text-base font-bold text-slate-900">
                {locale === 'en' ? 'Team Members' : 'Equipe da Oficina'}
              </h2>
            </div>
            <Button variant="primary" size="sm" onClick={() => setCreateMemberOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Add Operator' : 'Novo Operador'}
            </Button>
          </div>

          {teamQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{locale === 'en' ? 'Name' : 'Nome'}</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">{locale === 'en' ? 'Role' : 'Perfil'}</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(teamQuery.data ?? []).map((member) => {
                    const isSelf = member.id === session?.user.id;
                    return (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {member.name}
                          {isSelf && (
                            <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              {locale === 'en' ? 'You' : 'Você'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {member.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                            {t.role[member.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                              member.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {member.active
                              ? locale === 'en'
                                ? 'Active'
                                : 'Ativo'
                              : locale === 'en'
                                ? 'Inactive'
                                : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {!isSelf && (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetTarget(member)}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                {locale === 'en' ? 'Reset Pass' : 'Senha'}
                              </Button>
                              <Button
                                variant={member.active ? 'ghost' : 'outline'}
                                size="sm"
                                className={member.active ? 'text-red-600 hover:bg-red-50' : ''}
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: member.id,
                                    active: !member.active,
                                  })
                                }
                              >
                                {member.active ? (
                                  <>
                                    <UserX className="h-3.5 w-3.5" />
                                    {locale === 'en' ? 'Disable' : 'Desativar'}
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    {locale === 'en' ? 'Enable' : 'Reativar'}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Create Team Member Modal */}
      <Modal
        open={createMemberOpen}
        onClose={() => setCreateMemberOpen(false)}
        size="md"
        title={locale === 'en' ? 'Add Team Operator' : 'Cadastrar Novo Operador'}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateMemberOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!memberName.trim() || !memberEmail.trim() || memberPassword.length < 8}
              loading={createMemberMutation.isPending}
              onClick={() => createMemberMutation.mutate()}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={locale === 'en' ? 'Name' : 'Nome'} required>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="E-mail" required>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={locale === 'en' ? 'Role' : 'Perfil'} required>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as Role)}
                className={inputClassName}
              >
                <option value="TECHNICIAN">{t.role.TECHNICIAN}</option>
                <option value="ATTENDANT">{t.role.ATTENDANT}</option>
                <option value="OWNER">{t.role.OWNER}</option>
              </select>
            </Field>
            <Field label={locale === 'en' ? 'Initial password' : 'Senha inicial'} required>
              <input
                type="password"
                minLength={8}
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                placeholder="Mín. 8 chars"
                className={inputClassName}
              />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Reset Member Password Modal */}
      <Modal
        open={Boolean(resetTarget)}
        onClose={() => {
          setResetTarget(null);
          setResetNewPassword('');
        }}
        size="sm"
        title={locale === 'en' ? 'Reset Operator Password' : 'Redefinir Senha do Operador'}
        subtitle={resetTarget ? `${resetTarget.name} (${resetTarget.email})` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={resetNewPassword.length < 8}
              loading={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <Field label={t.auth.newPasswordLabel} required>
          <input
            type="password"
            minLength={8}
            value={resetNewPassword}
            onChange={(e) => setResetNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={inputClassName}
          />
        </Field>
      </Modal>
    </div>
  );
}
