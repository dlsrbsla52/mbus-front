'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { StopService, type Stop } from '@/lib/api/stop';
import { ReservationService } from '@/lib/api/reservation';
import { toApiOffsetDateTime, toApiLocalDate } from '@/lib/api/date-serializer';
import { extractApiError } from '@/lib/api/result-codes';
import type { PageResult } from '@/lib/api/types';

const STEPS = [
  { id: 1, label: '정류장 선택' },
  { id: 2, label: '상담 일정 입력' },
  { id: 3, label: '확인 / 예약' },
] as const;

interface Draft {
  stops: Stop[];
  consultationDate?: string;
  desiredContractStartDate?: string;
}

export default function ReservationNewPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<Draft>({ stops: [] });

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
    let cancelled = false;
    setStopsLoading(true);
    setStopsError('');
    StopService.list({
      page: stopPage,
      size: 10,
      ...(submittedKeyword ? { keyword: submittedKeyword } : {}),
    })
      .then((result) => { if (!cancelled) setStops(result); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '정류장 목록을 불러오지 못했습니다.';
        setStopsError(msg);
      })
      .finally(() => { if (!cancelled) setStopsLoading(false); });
    return () => { cancelled = true; };
  }, [step, stopPage, submittedKeyword]);

  const toggleStop = (s: Stop) => {
    const already = draft.stops.some((x) => x.id === s.id);
    setDraft({
      ...draft,
      stops: already ? draft.stops.filter((x) => x.id !== s.id) : [...draft.stops, s],
    });
  };

  const onSubmitReservation = async () => {
    if (!draft.stops.length || !draft.consultationDate || !draft.desiredContractStartDate) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await ReservationService.create({
        stopId: draft.stops.map((s) => s.id),
        consultationRequestedAt: toApiOffsetDateTime(draft.consultationDate),
        desiredContractStartDate: toApiLocalDate(draft.desiredContractStartDate),
      });
      router.replace('/reservation');
    } catch (e) {
      setSubmitError(extractApiError(e, '예약 생성에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  const stopColumns: DataTableColumn<Stop>[] = [
    {
      key: 'check',
      header: '',
      width: '40px',
      cell: (s) => (
        <input
          type="checkbox"
          checked={draft.stops.some((x) => x.id === s.id)}
          onChange={() => toggleStop(s)}
          className="h-4 w-4 accent-brand-blue"
        />
      ),
    },
    {
      key: 'arsId',
      header: 'ARS',
      width: '100px',
      cell: (s) => <span className="font-mono text-xs">{s.arsId}</span>,
    },
    {
      key: 'name',
      header: '정류장명',
      cell: (s) => (
        <button
          type="button"
          onClick={() => toggleStop(s)}
          className="text-left font-semibold hover:text-brand-blue"
        >
          {s.name}
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-black text-brand-black tracking-tight">예약하기</h1>
      <p className="mt-1 text-sm text-brand-gray-500">
        정류장을 선택하고 상담 희망 일자를 입력하면 상담 예약이 생성됩니다.
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
            <h2 className="text-lg font-bold text-brand-black">1. 정류장 선택</h2>

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
                placeholder="정류장 이름·번호로 검색"
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
                <Pagination
                  page={stops.page}
                  totalPages={stops.totalPages}
                  onChange={setStopPage}
                />
              </div>
            )}

            {draft.stops.length > 0 && (
              <div className="space-y-2 rounded-md border border-brand-blue/30 bg-brand-blue/5 p-3">
                <p className="text-xs font-semibold text-brand-blue">
                  선택된 정류장 {draft.stops.length}개
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.stops.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-brand-gray-200 px-2.5 py-1 text-xs font-semibold text-brand-black"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={() => toggleStop(s)}
                        className="text-brand-gray-400 hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={draft.stops.length === 0}
                onClick={() => setStep(2)}
                className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800 disabled:opacity-40"
              >
                다음 — 상담 일정
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-brand-black">2. 상담 일정 입력</h2>

            <div className="rounded-md bg-brand-gray-50 px-4 py-3 text-sm">
              <p className="text-xs text-brand-gray-500">선택한 정류장 {draft.stops.length}개</p>
              <p className="mt-1 text-xs text-brand-gray-700">
                {draft.stops.map((s) => s.name).join(' · ')}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="block text-xs font-semibold text-brand-gray-600">
                  상담 희망 일자 <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  value={draft.consultationDate ?? ''}
                  onChange={(e) => setDraft({ ...draft, consultationDate: e.target.value })}
                  className="mt-1 rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </label>

              <label className="block text-sm">
                <span className="block text-xs font-semibold text-brand-gray-600">
                  계약 시작 희망일 <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  value={draft.desiredContractStartDate ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, desiredContractStartDate: e.target.value })
                  }
                  className="mt-1 rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </label>
            </div>

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
                disabled={!draft.consultationDate || !draft.desiredContractStartDate}
                onClick={() => setStep(3)}
                className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800 disabled:opacity-40"
              >
                다음 — 확인
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-brand-black">3. 예약 확인</h2>

            <dl className="grid grid-cols-2 gap-y-2 rounded-md bg-brand-gray-50 p-4 text-sm">
              <dt className="text-brand-gray-500">선택 정류장</dt>
              <dd className="text-right font-semibold text-brand-black">
                {draft.stops.length}개
              </dd>
              <dt className="col-span-2 -mt-1 mb-1">
                <ul className="flex flex-wrap gap-1">
                  {draft.stops.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-full border border-brand-gray-200 bg-white px-2.5 py-0.5 text-xs text-brand-black"
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              </dt>
              <dt className="text-brand-gray-500">상담 희망 일자</dt>
              <dd className="text-right font-semibold text-brand-black">
                {draft.consultationDate ?? '—'}
              </dd>
              <dt className="text-brand-gray-500">계약 시작 희망일</dt>
              <dd className="text-right font-semibold text-brand-black">
                {draft.desiredContractStartDate ?? '—'}
              </dd>
            </dl>

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
