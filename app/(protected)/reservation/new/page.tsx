'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { StopService, type Stop } from '@/lib/api/stop';
import { ReservationService } from '@/lib/api/reservation';
import { messageForCode } from '@/lib/api/result-codes';
import type { PageResult } from '@/lib/api/types';

const STEPS = [
  { id: 1, label: '정류장 선택' },
  { id: 2, label: '기간 입력' },
  { id: 3, label: '확인 / 예약' },
] as const;

const DEFAULT_MONTHLY = 1500000;

interface Draft {
  stop?: Stop;
  startDate?: string;
  endDate?: string;
}

export default function ReservationNewPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<Draft>({});

  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [stopPage, setStopPage] = useState(0);
  const [stops, setStops] = useState<PageResult<Stop> | null>(null);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopsError, setStopsError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (step !== 1) return;
    setStopsLoading(true);
    setStopsError('');
    StopService.list({
      page: stopPage,
      size: 10,
      ...(submittedKeyword ? { keyword: submittedKeyword } : {}),
    })
      .then(setStops)
      .catch((e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '정류장 목록을 불러오지 못했습니다.';
        setStopsError(msg);
      })
      .finally(() => setStopsLoading(false));
  }, [step, stopPage, submittedKeyword]);

  const months = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return 0;
    const s = new Date(draft.startDate);
    const e = new Date(draft.endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
    return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
  }, [draft.startDate, draft.endDate]);

  const totalAmount = months * DEFAULT_MONTHLY;

  const onSubmitReservation = async () => {
    if (!draft.stop || !draft.startDate || !draft.endDate) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await ReservationService.create({
        contractId: '',
        stopId: draft.stop.id,
        startAt: `${draft.startDate}T00:00:00Z`,
        endAt: `${draft.endDate}T23:59:59Z`,
      });
      router.replace(`/reservation?created=${created.id}`);
    } catch (e) {
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      setSubmitError(messageForCode(res?.code ?? '', res?.message ?? '예약 생성에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  const stopColumns: DataTableColumn<Stop>[] = [
    { key: 'arsId', header: 'ARS', width: '100px', cell: (s) => <span className="font-mono text-xs">{s.arsId}</span> },
    { key: 'name', header: '정류장명', cell: (s) => <span className="font-semibold">{s.name}</span> },
    { key: 'district', header: '자치구', width: '120px', cell: (s) => s.district ?? '—' },
    {
      key: 'pick',
      header: '',
      width: '100px',
      align: 'right',
      cell: (s) => (
        <button
          type="button"
          onClick={() => {
            setDraft({ ...draft, stop: s });
            setStep(2);
          }}
          className="rounded-md bg-brand-black px-3 py-1 text-xs font-semibold text-white hover:bg-brand-gray-800"
        >
          선택
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-black text-brand-black tracking-tight">예약하기</h1>
      <p className="mt-1 text-sm text-brand-gray-500">
        정류장을 선택하고 기간을 정한 뒤 예약을 생성합니다.
      </p>

      <ol className="mt-6 flex items-center gap-2 text-xs">
        {STEPS.map((s, idx) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={
                step >= s.id
                  ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-black text-[10px] font-bold text-white'
                  : 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-gray-200 text-[10px] font-bold text-brand-gray-500'
              }
            >
              {s.id}
            </span>
            <span className={step >= s.id ? 'font-bold text-brand-black' : 'text-brand-gray-500'}>
              {s.label}
            </span>
            {idx < STEPS.length - 1 && <span className="text-brand-gray-300">›</span>}
          </li>
        ))}
      </ol>

      <section className="mt-8 rounded-lg border border-brand-gray-200 bg-white p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-black">1. 정류장 선택</h2>
              <p className="text-xs text-brand-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> 카카오맵 통합은 키 발급 후 활성화됩니다.
                </span>
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStopPage(0);
                setSubmittedKeyword(keyword.trim());
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="정류장 이름·자치구로 검색"
                className="w-full max-w-sm rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md border border-brand-gray-300 px-3 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
              >
                <Search className="h-4 w-4" />
                검색
              </button>
            </form>

            {stopsError && (
              <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {stopsError}
              </div>
            )}

            <DataTable
              columns={stopColumns}
              rows={stops?.content ?? []}
              rowKey={(s) => s.id}
              loading={stopsLoading}
            />

            {stops && (
              <div className="flex items-center justify-between text-xs text-brand-gray-500">
                <span>전체 {stops.totalElements.toLocaleString()}건</span>
                <Pagination page={stops.page} totalPages={stops.totalPages} onChange={setStopPage} />
              </div>
            )}
          </div>
        )}

        {step === 2 && draft.stop && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-brand-black">2. 기간 입력</h2>
            <div className="rounded-md bg-brand-gray-50 px-4 py-3 text-sm">
              <p className="text-xs text-brand-gray-500">선택한 정류장</p>
              <p className="font-bold text-brand-black">{draft.stop.name}</p>
              <p className="text-xs text-brand-gray-500">ARS {draft.stop.arsId} · {draft.stop.district ?? '—'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-xs font-semibold text-brand-gray-600">시작일</span>
                <input
                  type="date"
                  value={draft.startDate ?? ''}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  className="mt-1 w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-semibold text-brand-gray-600">종료일</span>
                <input
                  type="date"
                  value={draft.endDate ?? ''}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                  className="mt-1 w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </label>
            </div>
            <p className="text-xs text-brand-gray-500">
              기본 계약 단위는 1년입니다. 점유 구간 마스킹은 백엔드 availability API 연결 후 활성화됩니다.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!draft.startDate || !draft.endDate || months === 0}
                onClick={() => setStep(3)}
                className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800 disabled:opacity-40"
              >
                다음 — 확인
              </button>
            </div>
          </div>
        )}

        {step === 3 && draft.stop && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-brand-black">3. 예약 확인</h2>

            <dl className="grid grid-cols-2 gap-y-2 rounded-md bg-brand-gray-50 p-4 text-sm">
              <dt className="text-brand-gray-500">정류장</dt>
              <dd className="text-right font-semibold text-brand-black">{draft.stop.name}</dd>
              <dt className="text-brand-gray-500">ARS</dt>
              <dd className="text-right font-mono text-xs text-brand-gray-700">{draft.stop.arsId}</dd>
              <dt className="text-brand-gray-500">기간</dt>
              <dd className="text-right font-semibold text-brand-black">
                {draft.startDate} ~ {draft.endDate} ({months}개월)
              </dd>
              <dt className="text-brand-gray-500">월 단가 (임시)</dt>
              <dd className="text-right font-semibold text-brand-black">
                {DEFAULT_MONTHLY.toLocaleString()}원
              </dd>
              <dt className="border-t border-brand-gray-200 pt-2 font-bold text-brand-black">예상 총액</dt>
              <dd className="border-t border-brand-gray-200 pt-2 text-right text-base font-black text-brand-blue">
                {totalAmount.toLocaleString()}원
              </dd>
            </dl>
            <p className="text-xs text-brand-gray-500">
              ⓘ 실제 단가는 백엔드의 GET /api/v1/stop/{'{id}'}/price?date= 가 연결되면 정확히 재계산됩니다.
            </p>

            {submitError && (
              <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={onSubmitReservation}
                disabled={submitting}
                className="rounded-md bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-brand-blue/90 disabled:opacity-50"
              >
                {submitting ? '예약 생성 중…' : '예약 생성'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
