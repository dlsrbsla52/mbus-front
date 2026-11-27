'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import FormField, { Select, TextInput } from '@/components/common/FormField';
import PageHeader from '@/components/common/PageHeader';
import { CONTRACT_CREATE_NAV, CONTRACT_MANAGE_NAV } from '@/constants/navigation';
import {
  AdminContractService,
  CONTRACT_PAYMENT_CYCLE_LABEL,
  CONTRACT_PAYMENT_METHOD_LABEL,
  UUID_PATTERN,
  type ContractPaymentCycle,
  type ContractPaymentMethod,
} from '@/lib/api/admin/contract';
import { AdminStopService } from '@/lib/api/admin/stop';
import { AdminMemberService } from '@/lib/api/member';
import { extractApiError } from '@/lib/api/result-codes';
import { useAuthStore } from '@/store/useAuthStore';

const AMOUNT_PATTERN = '[0-9]{1,13}(?:[.][0-9]{1,2})?';
const BUTTON_CLASS = 'rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

export default function ContractCreatePage() {
  const canCreate = useAuthStore((state) =>
    state.hasPermission(CONTRACT_CREATE_NAV.requirePermission) &&
    state.hasMemberType(CONTRACT_CREATE_NAV.requireMemberType),
  );

  return canCreate ? <ContractCreateForm /> : null;
}

function ContractCreateForm() {
  const canManage = useAuthStore((state) =>
    state.hasPermission(CONTRACT_MANAGE_NAV.requirePermission) &&
    state.hasMemberType(CONTRACT_MANAGE_NAV.requireMemberType),
  );
  const canAssign = useAuthStore((state) =>
    state.hasPermission('MANAGE') && state.hasMemberType('ADMIN_MASTER'),
  );
  const isMaster = useAuthStore((state) => state.hasMemberType('ADMIN_MASTER'));
  const loginId = useAuthStore((state) => state.user?.loginId);
  const [period, setPeriod] = useState<'months' | 'end'>('months');
  const [stopId, setStopId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Awaited<ReturnType<typeof AdminContractService.create>> | null>(null);
  const submitting = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const read = (name: string) => String(fields.get(name) ?? '').trim();
    const contractName = read('contractName');
    const startDate = read('startDate');
    const endDate = read('endDate');
    const totalAmount = read('totalAmount');
    const payAmount = read('payAmount');

    if (!contractName) {
      setError('계약명을 입력해 주세요.');
      return;
    }
    if (period === 'end' && endDate <= startDate) {
      setError('계약 종료일은 시작일 이후여야 합니다.');
      return;
    }
    if ([totalAmount, payAmount].some((amount) => amount && Number(amount) <= 0)) {
      setError('금액을 입력하는 경우 0보다 커야 합니다.');
      return;
    }

    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const contract = await AdminContractService.create({
        contractName,
        stopId: read('stopId'),
        startDate,
        ...(period === 'months' ? { durationMonths: Number(read('durationMonths')) } : { endDate }),
        totalAmount: totalAmount || undefined,
        payAmount: payAmount || undefined,
        paymentCycle: read('paymentCycle') as ContractPaymentCycle,
        paymentMethod: read('paymentMethod') as ContractPaymentMethod,
        memberId: read('memberId') || undefined,
        managerId: isMaster ? read('managerId') || undefined : undefined,
      });
      setCreated(contract);
    } catch (e) {
      setError(extractApiError(e, '계약을 등록하지 못했습니다.'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="계약 등록" actions={canManage && <Link href={CONTRACT_MANAGE_NAV.href} className="text-sm underline">계약 목록</Link>} />
      {created ? (
        <section className="grid gap-3 rounded-lg border border-brand-gray-200 bg-white p-5">
          <h2 className="font-bold" role="status">계약이 등록되었습니다.</h2>
          <p>{created.contractName} · {created.stopName ?? created.stopId}</p>
          <p className="text-sm text-brand-gray-600">계약 ID {created.id}</p>
          <button type="button" className={`w-fit ${BUTTON_CLASS}`} onClick={() => {
            setPeriod('months');
            setStopId('');
            setMemberId('');
            setManagerId('');
            setCreated(null);
          }}>새 계약 등록</button>
        </section>
      ) : (
        <form onSubmit={submit} className="rounded-lg border border-brand-gray-200 bg-white p-5">
          <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
            <FormField label="계약명" htmlFor="contract-name" required>
              <TextInput id="contract-name" name="contractName" maxLength={300} required />
            </FormField>
            <IdLookup
              name="stopId"
              label="정류장"
              lookup={canManage ? findStops : undefined}
              value={stopId}
              onChange={setStopId}
              required
            />
            <IdLookup name="memberId" label="계약 회원" lookup={findMembers} value={memberId} onChange={setMemberId} />
            {isMaster ? (
              <IdLookup
                name="managerId"
                label="영업 담당자"
                lookup={canAssign ? findManagers : undefined}
                value={managerId}
                onChange={setManagerId}
                hint="비워두면 로그인 계정이 담당자로 지정됩니다."
              />
            ) : (
              <div>
                <p className="text-sm font-semibold">영업 담당자</p>
                <p className="mt-2 text-sm text-brand-gray-600">{loginId}</p>
              </div>
            )}
            <FormField label="계약 시작일" htmlFor="start-date" required>
              <TextInput id="start-date" name="startDate" type="date" max="9999-12-31" required />
            </FormField>
            <FormField label="계약 기간 입력 방식" htmlFor="period-mode">
              <Select id="period-mode" value={period} onChange={(event) => setPeriod(event.target.value === 'end' ? 'end' : 'months')}>
                <option value="months">개월 수</option>
                <option value="end">종료일</option>
              </Select>
            </FormField>
            {period === 'months' ? (
              <FormField label="계약 개월 수" htmlFor="duration-months" required>
                <TextInput id="duration-months" name="durationMonths" type="number" min={1} max={119987} step={1} required />
              </FormField>
            ) : (
              <FormField label="계약 종료일" htmlFor="end-date" hint="종료일 00:00(한국 시간)에 계약이 끝납니다." required>
                <TextInput id="end-date" name="endDate" type="date" max="9999-12-31" required />
              </FormField>
            )}
            <FormField label="총 계약금액 (원)" htmlFor="total-amount" hint="비워두면 정류장 월 단가와 계약 기간으로 자동 산정됩니다.">
              <TextInput id="total-amount" name="totalAmount" inputMode="decimal" pattern={AMOUNT_PATTERN} />
            </FormField>
            <FormField label="납부 주기" htmlFor="payment-cycle" required>
              <Select id="payment-cycle" name="paymentCycle" required>
                {Object.entries(CONTRACT_PAYMENT_CYCLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <FormField label="납부 방법" htmlFor="payment-method" required>
              <Select id="payment-method" name="paymentMethod" required>
                {Object.entries(CONTRACT_PAYMENT_METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <FormField label="분할납 1회 금액 (원)" htmlFor="pay-amount">
              <TextInput id="pay-amount" name="payAmount" inputMode="decimal" pattern={AMOUNT_PATTERN} />
            </FormField>
          </fieldset>
          {error && <p role="alert" className="mt-4 whitespace-pre-line rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={saving} className={BUTTON_CLASS}>{saving ? '등록 중…' : '등록'}</button>
          </div>
        </form>
      )}
    </>
  );
}

interface LookupOption {
  id: string;
  label: string;
}

async function findStops(keyword: string): Promise<LookupOption[]> {
  const stops = await AdminStopService.search(keyword);
  return stops.map((stop) => ({
    id: stop.id,
    label: `${stop.name} (${stop.arsId}) · ${stop.unitPrice == null ? '월 단가 미등록' : `월 ${stop.unitPrice.toLocaleString('ko-KR')}원`}`,
  }));
}

async function findMembers(keyword: string): Promise<LookupOption[]> {
  const result = await AdminMemberService.searchUsers({ keyword, size: 20 });
  return result.content.map((member) => ({ id: member.memberId, label: `${member.memberName} (${member.loginId})` }));
}

async function findManagers(keyword: string): Promise<LookupOption[]> {
  const result = await AdminMemberService.searchAdmins({ keyword, size: 20, status: 'ACTIVE' });
  return result.content.map((member) => ({ id: member.memberId, label: `${member.memberName} (${member.loginId})` }));
}

function IdLookup({ name, label, lookup, value, onChange, required, hint }: {
  name: string;
  label: string;
  lookup?: (keyword: string) => Promise<LookupOption[]>;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const { data, error, isLoading, mutate } = useSWR(
    lookup && query ? ['contract-create-lookup', name, query] as const : null,
    ([, , keyword]) => lookup!(keyword),
  );

  const search = () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    if (query === trimmed) void mutate();
    else setQuery(trimmed);
  };

  return (
    <div className="grid content-start gap-2">
      <FormField label={`${label} ID`} htmlFor={name} required={required} hint={selected?.id === value ? selected.label : hint}>
        <TextInput id={name} name={name} value={value} onChange={(event) => onChange(event.target.value)} pattern={UUID_PATTERN} required={required} />
      </FormField>
      {lookup && (
        <>
          <div className="flex gap-2">
            <TextInput aria-label={`${label} 검색어`} type="search" value={keyword} maxLength={100}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  search();
                }
              }}
              placeholder={`${label} 검색`}
            />
            <button type="button" disabled={!keyword.trim()} className={`shrink-0 ${BUTTON_CLASS}`} onClick={search}>검색</button>
          </div>
          {isLoading && <p role="status" className="text-xs">검색 중…</p>}
          {error && <p role="alert" className="text-xs text-danger">{extractApiError(error, `${label} 검색에 실패했습니다.`)}</p>}
          {data?.length === 0 && <p role="status" className="text-xs text-brand-gray-500">검색 결과가 없습니다.</p>}
          {!!data?.length && (
            <ul aria-label={`${label} 검색 결과`} className="max-h-40 divide-y divide-brand-gray-100 overflow-auto rounded-md border border-brand-gray-200">
              {data.map((option) => (
                <li key={option.id}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-brand-gray-50" onClick={() => {
                    onChange(option.id);
                    setSelected(option);
                    setQuery('');
                    setKeyword('');
                  }}>{option.label}</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
