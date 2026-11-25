'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  KeyRound,
  Plus,
  Printer,
  Save,
  Shield,
  Tag,
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
import { useI18n } from '@/lib/i18n/I18nProvider';
import {
  usePrintPreferences,
  type LabelPrintFormat,
} from '@/lib/settings/PrintPreferencesContext';
import type { Role, UserResponse } from '@/lib/types/api';
import {
  formatCurrencyInput,
  maskCurrencyBRL,
  maskInteger,
  parseCurrencyBRL,
} from '@/lib/utils/masks';
import { canManageShopSettings, canManageTeam } from '@/lib/utils/permissions';

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
  const [newApplianceType, setNewApplianceType] = useState('');

  const serverSettings = settingsQuery.data;
  const defaultLaborInput =
    defaultLaborDraft ?? (serverSettings ? formatCurrencyInput(serverSettings.defaultLaborCost) : '');
  const defaultDays =
    defaultDaysDraft ?? (serverSettings ? String(serverSettings.defaultEstimatedDays) : '3');
  const abandonmentDays =
    abandonmentDaysDraft ?? (serverSettings ? String(serverSettings.abandonmentDays) : '180');
  const waIntake = waIntakeDraft ?? (serverSettings?.whatsappIntakeTemplate ?? '');
  const waQuote = waQuoteDraft ?? (serverSettings?.whatsappQuoteTemplate ?? '');
  const waReady = waReadyDraft ?? (serverSettings?.whatsappReadyTemplate ?? '');

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
        whatsappIntakeTemplate: waIntake.trim() || undefined,
        whatsappQuoteTemplate: waQuote.trim(),
        whatsappReadyTemplate: waReady.trim() || undefined,
      }),
    onSuccess: async () => {
      setDefaultLaborDraft(null);
      setDefaultDaysDraft(null);
      setAbandonmentDaysDraft(null);
      setWaIntakeDraft(null);
      setWaQuoteDraft(null);
      setWaReadyDraft(null);
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
                  ? 'Variables: {customerName}, {orderNumber}, {appliances}, {totalPrice}, {trackingUrl}'
                  : 'Variáveis disponíveis: {customerName}, {orderNumber}, {appliances}, {totalPrice}, {trackingUrl}'}
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

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="WhatsApp · Entrada (INTAKE)">
                  <textarea
                    rows={4}
                    value={waIntake}
                    onChange={(e) => setWaIntakeDraft(e.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="WhatsApp · Orçamento (QUOTE)" required>
                  <textarea
                    rows={4}
                    value={waQuote}
                    onChange={(e) => setWaQuoteDraft(e.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="WhatsApp · Pronto (READY)">
                  <textarea
                    rows={4}
                    value={waReady}
                    onChange={(e) => setWaReadyDraft(e.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>
          )}
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
