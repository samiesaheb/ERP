'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type { Company, CompanyGroup, CompanyGroupMember, Country } from '@/lib/types';

function getActiveCompanyIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = JSON.parse(atob(match[1].split('.')[1]));
    return (payload as { company_id?: string }).company_id ?? null;
  } catch {
    return null;
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENCIES = ['THB', 'USD', 'EUR', 'GBP', 'SGD', 'CNY', 'JPY', 'AUD'];

// ---------------------------------------------------------------------------
// Companies tab
// ---------------------------------------------------------------------------

const COMPANY_COLUMNS = (
  t: (k: string) => string,
  countryMap: Record<string, string>,
  companyMap: Record<string, string>,
  activeCompanyId: string | null,
): Column<Company>[] => [
  {
    key: 'code',
    header: t('Code'),
    sortable: true,
    render: (row) => (
      <span className="flex items-center gap-2">
        {row.code}
        {row.id === activeCompanyId && (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
            Current
          </span>
        )}
      </span>
    ),
  },
  { key: 'name',   header: t('Name'),    sortable: true },
  {
    key: 'parent_company_id',
    header: t('Parent'),
    render: (row) => row.parent_company_id ? companyMap[row.parent_company_id] ?? '—' : '—',
  },
  {
    key: 'country_id',
    header: t('Country'),
    render: (row) => row.country_id ? countryMap[row.country_id] ?? '—' : '—',
  },
  { key: 'base_currency', header: t('Currency'), sortable: true },
  {
    key: 'is_active',
    header: t('Status'),
    render: (row) => (
      <Badge variant={row.is_active ? 'green' : 'gray'}>
        {row.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

interface CompanyForm {
  code:                    string;
  name:                    string;
  country_id:              string;
  address:                 string;
  base_currency:           string;
  fiscal_year_start_month: string;
  registration_number:     string;
  tax_id:                  string;
  logo_url:                string;
  parent_company_id:       string;
  is_active:               boolean;
}

const EMPTY_COMPANY: CompanyForm = {
  code:                    '',
  name:                    '',
  country_id:              '',
  address:                 '',
  base_currency:           'THB',
  fiscal_year_start_month: '1',
  registration_number:     '',
  tax_id:                  '',
  logo_url:                '',
  parent_company_id:       '',
  is_active:               true,
};

// ---------------------------------------------------------------------------
// Groups tab
// ---------------------------------------------------------------------------

const GROUP_COLUMNS = (t: (k: string) => string): Column<CompanyGroup>[] => [
  { key: 'name',        header: t('Group Name'),  sortable: true },
  { key: 'description', header: t('Description'), render: (row) => row.description ?? '—' },
  {
    key: 'created_at',
    header: t('Created'),
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

interface GroupForm {
  name:        string;
  description: string;
}

const EMPTY_GROUP: GroupForm = { name: '', description: '' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompaniesClient({
  companies,
  groups,
  members,
  countries,
}: {
  companies: Company[];
  groups:    CompanyGroup[];
  members:   CompanyGroupMember[];
  countries: Country[];
}) {
  const router = useRouter();
  const { t }  = useAppPrefs();

  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState('');

  useEffect(() => {
    setActiveCompanyId(getActiveCompanyIdFromCookie());
  }, []);

  async function handleSwitch(companyId: string) {
    setSwitching(companyId);
    setSwitchError('');
    try {
      const res = await fetch('/api/auth/select-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to switch company');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Failed to switch company');
      setSwitching(null);
    }
  }

  const countryMap  = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  const companyMap  = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  // membership map: group_id → Set<company_id>
  const membershipMap = members.reduce<Record<string, Set<string>>>((acc, m) => {
    if (!acc[m.group_id]) acc[m.group_id] = new Set();
    acc[m.group_id].add(m.company_id);
    return acc;
  }, {});

  const [activeTab, setActiveTab] = useState<'companies' | 'groups'>('companies');

  // ---- Company slide-over state ----
  const [companyOpen,    setCompanyOpen]    = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm,    setCompanyForm]    = useState<CompanyForm>(EMPTY_COMPANY);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError,   setCompanyError]   = useState('');

  // ---- Group slide-over state ----
  const [groupOpen,    setGroupOpen]    = useState(false);
  const [editingGroup, setEditingGroup] = useState<CompanyGroup | null>(null);
  const [groupForm,    setGroupForm]    = useState<GroupForm>(EMPTY_GROUP);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError,   setGroupError]   = useState('');
  const [addingMember, setAddingMember] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  // current group members (local state, updated optimistically)
  const [localMembers, setLocalMembers] = useState<CompanyGroupMember[]>(members);

  // ---- Company handlers ----
  function openCreateCompany() {
    setEditingCompany(null);
    setCompanyForm(EMPTY_COMPANY);
    setCompanyError('');
    setCompanyOpen(true);
  }

  function openEditCompany(c: Company) {
    setEditingCompany(c);
    setCompanyForm({
      code:                    c.code,
      name:                    c.name,
      country_id:              c.country_id              ?? '',
      address:                 c.address                 ?? '',
      base_currency:           c.base_currency,
      fiscal_year_start_month: String(c.fiscal_year_start_month),
      registration_number:     c.registration_number     ?? '',
      tax_id:                  c.tax_id                  ?? '',
      logo_url:                c.logo_url                ?? '',
      parent_company_id:       c.parent_company_id       ?? '',
      is_active:               c.is_active,
    });
    setCompanyError('');
    setCompanyOpen(true);
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCompanyError('');
    setCompanyLoading(true);
    try {
      const payload = {
        code:                    companyForm.code,
        name:                    companyForm.name,
        country_id:              companyForm.country_id              || null,
        address:                 companyForm.address                 || null,
        base_currency:           companyForm.base_currency,
        fiscal_year_start_month: parseInt(companyForm.fiscal_year_start_month, 10),
        registration_number:     companyForm.registration_number     || null,
        tax_id:                  companyForm.tax_id                  || null,
        logo_url:                companyForm.logo_url                || null,
        parent_company_id:       companyForm.parent_company_id       || null,
        ...(editingCompany ? { is_active: companyForm.is_active } : {}),
      };
      if (editingCompany) {
        await clientFetch(`/api/v1/companies/${editingCompany.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await clientFetch('/api/v1/companies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setCompanyOpen(false);
      router.refresh();
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setCompanyLoading(false);
    }
  }

  // ---- Group handlers ----
  function openCreateGroup() {
    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP);
    setGroupError('');
    setAddingMember('');
    setGroupOpen(true);
  }

  function openEditGroup(g: CompanyGroup) {
    setEditingGroup(g);
    setGroupForm({ name: g.name, description: g.description ?? '' });
    setGroupError('');
    setAddingMember('');
    setGroupOpen(true);
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGroupError('');
    setGroupLoading(true);
    try {
      const payload = {
        name:        groupForm.name,
        description: groupForm.description || null,
      };
      if (editingGroup) {
        await clientFetch(`/api/v1/company-groups/${editingGroup.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await clientFetch('/api/v1/company-groups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setGroupOpen(false);
      router.refresh();
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setGroupLoading(false);
    }
  }

  async function handleAddMember() {
    if (!editingGroup || !addingMember) return;
    setMemberLoading(true);
    try {
      await clientFetch(`/api/v1/company-groups/${editingGroup.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ company_id: addingMember }),
      });
      setLocalMembers((prev) => [
        ...prev,
        { group_id: editingGroup.id, company_id: addingMember },
      ]);
      setAddingMember('');
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setMemberLoading(false);
    }
  }

  async function handleRemoveMember(companyId: string) {
    if (!editingGroup) return;
    try {
      await clientFetch(
        `/api/v1/company-groups/${editingGroup.id}/members/${companyId}`,
        { method: 'DELETE' },
      );
      setLocalMembers((prev) =>
        prev.filter((m) => !(m.group_id === editingGroup.id && m.company_id === companyId))
      );
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  const currentGroupMemberIds = editingGroup
    ? (localMembers.filter((m) => m.group_id === editingGroup.id).map((m) => m.company_id))
    : [];

  const availableToAdd = companies.filter(
    (c) => !currentGroupMemberIds.includes(c.id),
  );

  // ---- Render ----
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
        : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
    }`;

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-0 border-b-[0.5px] border-neutral-200 dark:border-neutral-800 mb-5">
        <button className={tabCls(activeTab === 'companies')} onClick={() => setActiveTab('companies')}>
          Companies
        </button>
        <button className={tabCls(activeTab === 'groups')} onClick={() => setActiveTab('groups')}>
          Groups
        </button>
      </div>

      {/* ---- Companies tab ---- */}
      {activeTab === 'companies' && (
        <div className="bg-white dark:bg-neutral-900 border-[0.5px] border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          {switchError && (
            <p className="mx-4 mt-3 text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {switchError}
            </p>
          )}
          <DataTable
            columns={COMPANY_COLUMNS(t, countryMap, companyMap, activeCompanyId)}
            toolbar={<Button onClick={openCreateCompany}>+ New Company</Button>}
            data={companies}
            onRowClick={(row) => openEditCompany(row)}
            actions={(row) => [
              {
                label: row.id === activeCompanyId
                  ? 'Current'
                  : switching === row.id
                    ? 'Switching…'
                    : 'Switch to',
                onClick: () => {
                  if (row.id !== activeCompanyId && switching === null) {
                    handleSwitch(row.id);
                  }
                },
              },
              { label: 'Edit', onClick: () => openEditCompany(row) },
            ]}
          />
        </div>
      )}

      {/* ---- Groups tab ---- */}
      {activeTab === 'groups' && (
        <div className="bg-white dark:bg-neutral-900 border-[0.5px] border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <DataTable
            columns={GROUP_COLUMNS(t)}
            toolbar={<Button onClick={openCreateGroup}>+ New Group</Button>}
            data={groups}
            onRowClick={(row) => openEditGroup(row)}
            actions={(row) => [
              { label: 'Edit', onClick: () => openEditGroup(row) },
            ]}
          />
        </div>
      )}

      {/* ---- Company SlideOver ---- */}
      <SlideOver
        open={companyOpen}
        onClose={() => setCompanyOpen(false)}
        title={editingCompany ? editingCompany.name : 'New Company'}
      >
        <form onSubmit={handleCompanySubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={companyForm.code}
                onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SKYHI"
                disabled={!!editingCompany}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Base Currency <span className="text-red-500">*</span>
              </label>
              <ComboBox
                required
                value={companyForm.base_currency}
                onChange={(v) => setCompanyForm({ ...companyForm, base_currency: v })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              placeholder="Full legal name"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Parent Company
            </label>
            <ComboBox
              value={companyForm.parent_company_id}
              onChange={(v) => setCompanyForm({ ...companyForm, parent_company_id: v })}
              options={companies
                .filter((c) => c.id !== editingCompany?.id)
                .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
              placeholder="None (top-level)"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Country
            </label>
            <ComboBox
              value={companyForm.country_id}
              onChange={(v) => setCompanyForm({ ...companyForm, country_id: v })}
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select country…"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Address
            </label>
            <textarea
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Reg. Number
              </label>
              <input
                value={companyForm.registration_number}
                onChange={(e) => setCompanyForm({ ...companyForm, registration_number: e.target.value })}
                placeholder="Company reg no."
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Tax ID / VAT
              </label>
              <input
                value={companyForm.tax_id}
                onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                placeholder="VAT / tax number"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Fiscal Year Start
            </label>
            <ComboBox
              value={companyForm.fiscal_year_start_month}
              onChange={(v) => setCompanyForm({ ...companyForm, fiscal_year_start_month: v })}
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Logo URL
            </label>
            <input
              value={companyForm.logo_url}
              onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900"
            />
          </div>

          {editingCompany && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={companyForm.is_active}
                onChange={(e) => setCompanyForm({ ...companyForm, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm text-neutral-700 dark:text-neutral-300">
                Active
              </label>
            </div>
          )}

          {companyError && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {companyError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={companyLoading} className="flex-1">
              {companyLoading
                ? (editingCompany ? 'Saving…' : 'Creating…')
                : (editingCompany ? 'Save Changes' : 'Create Company')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCompanyOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>

      {/* ---- Group SlideOver ---- */}
      <SlideOver
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title={editingGroup ? editingGroup.name : 'New Group'}
      >
        <form onSubmit={handleGroupSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="e.g. ABC Holdings"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Description
            </label>
            <textarea
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 resize-none"
            />
          </div>

          {groupError && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {groupError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={groupLoading} className="flex-1">
              {groupLoading
                ? (editingGroup ? 'Saving…' : 'Creating…')
                : (editingGroup ? 'Save Changes' : 'Create Group')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setGroupOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>

        {/* Member management — only when editing an existing group */}
        {editingGroup && (
          <div className="mt-6 pt-5 border-t-[0.5px] border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Member Companies
            </p>

            {/* Current members */}
            <div className="space-y-1.5 mb-3">
              {currentGroupMemberIds.length === 0 && (
                <p className="text-xs text-neutral-400">No members yet.</p>
              )}
              {currentGroupMemberIds.map((cid) => {
                const comp = companies.find((c) => c.id === cid);
                if (!comp) return null;
                return (
                  <div
                    key={cid}
                    className="flex items-center justify-between px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded text-sm"
                  >
                    <span className="text-neutral-800 dark:text-neutral-200">
                      <span className="font-medium">{comp.code}</span>
                      <span className="text-neutral-400 ml-2">{comp.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(cid)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add member */}
            {availableToAdd.length > 0 && (
              <div className="flex gap-2">
                <ComboBox
                  value={addingMember}
                  onChange={setAddingMember}
                  options={availableToAdd.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                  placeholder="Add company…"
                  className="flex-1 px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!addingMember || memberLoading}
                  onClick={handleAddMember}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </>
  );
}
