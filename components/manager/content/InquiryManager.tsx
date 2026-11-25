'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import FormField from '@/components/common/FormField';
import { AdminContentService, INQUIRY_STATUS_LABEL, type AdminInquiry, type InquiryStatus } from '@/lib/api/admin/content';
import { useAuthStore } from '@/store/useAuthStore';
import { dangerButton, ErrorBanner, errorText, inputClass, primaryButton, secondaryButton } from '@/components/manager/content/shared';

const PAGE_SIZE = 20;
const TABS: { value: InquiryStatus | undefined; label: string }[] = [
  { value: 'RECEIVED', label: '접수' },
  { value: 'DONE', label: '처리 완료' },
  { value: undefined, label: '전체' },
];

const formatDateTime = (value: string | null) =>
  value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value)) : '-';

function StatusBadge({ status }: { status: InquiryStatus }) {
  return status === 'DONE' ? (
    <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">{INQUIRY_STATUS_LABEL.DONE}</span>
  ) : (
    <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">{INQUIRY_STATUS_LABEL.RECEIVED}</span>
  );
}

/** 관리자 온라인 문의: 상태별 목록 · 상세 · 처리 상태와 메모 저장. */
export default function InquiryManager() {
  const [status, setStatus] = useState<InquiryStatus | undefined>('RECEIVED');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminInquiry | null>(null);

  const { data, error, isLoading, mutate } = useSWR(['admin-inquiries', status, page], () =>
    AdminContentService.inquiries({ status, page, size: PAGE_SIZE }),
  );

  const columns: DataTableColumn<AdminInquiry>[] = [
    { key: 'createdAt', header: '접수일시', width: '150px', cell: (i) => formatDateTime(i.createdAt) },
    { key: 'name', header: '성명', width: '110px', cell: (i) => <span className="font-semibold text-brand-black">{i.name}</span> },
    { key: 'contact', header: '연락처', width: '220px', cell: (i) => <span className="text-xs">{i.phone}<br />{i.email}</span> },
    { key: 'content', header: '내용', cell: (i) => <span className="line-clamp-1 text-sm text-brand-gray-600">{i.content}</span> },
    { key: 'status', header: '상태', width: '100px', align: 'center', cell: (i) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <PageHeader title="온라인 문의" description="홈페이지 온라인 문의를 확인하고 처리 상태를 기록합니다. 처리 완료한 문의는 완료 후 90일이 지나면 자동 삭제됩니다." />
      <div className="flex gap-1 border-b border-brand-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(0);
            }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              status === tab.value ? 'border-brand-black text-brand-black' : 'border-transparent text-brand-gray-500 hover:text-brand-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {data && <span className="ml-auto self-center text-xs text-brand-gray-500">{data.totalElements.toLocaleString()}건</span>}
      </div>
      <ErrorBanner>{error && errorText(error, '문의를 불러오지 못했습니다.')}</ErrorBanner>
      <DataTable columns={columns} rows={data?.content ?? []} rowKey={(i) => i.id} loading={isLoading} empty="문의가 없습니다." onRowClick={setSelected} />
      <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
      {selected && (
        <InquiryDetailModal
          inquiry={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            void mutate();
          }}
        />
      )}
    </>
  );
}

function InquiryDetailModal({ inquiry, onClose, onSaved }: { inquiry: AdminInquiry; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status);
  const [memo, setMemo] = useState(inquiry.adminMemo ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const canWrite = useAuthStore((s) => s.hasPermission('WRITE'));

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      // 빈 문자열도 그대로 보낸다. 서버는 null이면 기존 메모를 유지하고 빈 문자열이면 지운다.
      await AdminContentService.changeInquiryStatus(inquiry.id, { status, memo: memo.trim() });
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '저장하지 못했습니다.'));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`${inquiry.name}님의 문의를 삭제할까요? 삭제한 문의는 복구할 수 없습니다.`)) return;
    setBusy(true);
    setMessage('');
    try {
      await AdminContentService.deleteInquiry(inquiry.id);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '삭제하지 못했습니다.'));
      setBusy(false);
    }
  };

  const rows: [string, string][] = [
    ['접수일시', formatDateTime(inquiry.createdAt)],
    ['성명', inquiry.name],
    ['전화번호', inquiry.phone],
    ['이메일', inquiry.email],
    ['처리일시', formatDateTime(inquiry.handledAt)],
  ];

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title="온라인 문의"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button type="button" className={dangerButton} onClick={remove} disabled={busy || !canWrite}>
            삭제
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
              닫기
            </button>
            <button type="button" className={primaryButton} onClick={save} disabled={busy || !canWrite}>
              저장
            </button>
          </div>
        </div>
      }
    >
      <dl className="grid grid-cols-[90px_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-brand-gray-500">{label}</dt>
            <dd className="text-brand-black">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 whitespace-pre-line rounded-md bg-brand-gray-50 p-4 text-sm leading-6 text-brand-gray-800">{inquiry.content}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr]">
        <FormField label="처리 상태" htmlFor="inquiry-status">
          <select id="inquiry-status" value={status} disabled={!canWrite} onChange={(e) => setStatus(e.target.value as InquiryStatus)} className={inputClass}>
            <option value="RECEIVED">{INQUIRY_STATUS_LABEL.RECEIVED}</option>
            <option value="DONE">{INQUIRY_STATUS_LABEL.DONE}</option>
          </select>
        </FormField>
        <FormField label="처리 메모" htmlFor="inquiry-memo">
          <textarea id="inquiry-memo" value={memo} readOnly={!canWrite} onChange={(e) => setMemo(e.target.value)} rows={3} maxLength={2000} className={inputClass} />
        </FormField>
      </div>
      {!canWrite && <p className="mt-3 text-xs text-brand-gray-500">쓰기 권한이 없어 상태 변경과 삭제를 할 수 없습니다. 내용만 확인할 수 있습니다.</p>}
      <div className="mt-3">
        <ErrorBanner>{message}</ErrorBanner>
      </div>
    </Modal>
  );
}
