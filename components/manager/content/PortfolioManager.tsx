'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import useSWR from 'swr';
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Plus, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import FormField from '@/components/common/FormField';
import { PORTFOLIO_CATEGORIES, PORTFOLIO_CATEGORY_LABEL, type PortfolioCategory } from '@/lib/api/content-model';
import { AdminContentService, uploadContentImage, type AdminPortfolio } from '@/lib/api/admin/content';
import {
  dangerButton,
  ErrorBanner,
  errorText,
  fieldClass,
  inputClass,
  moveItem,
  primaryButton,
  secondaryButton,
  VisibilityBadge,
} from '@/components/manager/content/shared';

const PAGE_SIZE = 20;

/** 관리자 포트폴리오: 목록(숨김 포함) · 등록/수정(이미지 업로드) · 삭제 · 순서 편집. */
export default function PortfolioManager() {
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState<PortfolioCategory | ''>('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<AdminPortfolio | 'new' | null>(null);
  const [ordering, setOrdering] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(['admin-portfolios', category, keyword, page], () =>
    AdminContentService.portfolios({ category: category || undefined, keyword: keyword || undefined, page, size: PAGE_SIZE }),
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const columns: DataTableColumn<AdminPortfolio>[] = [
    {
      key: 'thumb',
      header: '이미지',
      width: '120px',
      cell: (p) => (
        // eslint-disable-next-line @next/next/no-img-element -- 저장소 공개 URL
        <img src={p.thumbnailUrl} alt="" className="h-14 w-24 rounded object-cover" />
      ),
    },
    {
      key: 'title',
      header: '제목 / 설명',
      cell: (p) => (
        <div>
          <p className="font-semibold text-brand-black">{p.title}</p>
          {p.description && <p className="line-clamp-1 text-xs text-brand-gray-500">{p.description}</p>}
        </div>
      ),
    },
    { key: 'category', header: '분류', width: '90px', cell: (p) => PORTFOLIO_CATEGORY_LABEL[p.category] },
    { key: 'visible', header: '노출', width: '80px', align: 'center', cell: (p) => <VisibilityBadge visible={p.visible} /> },
    { key: 'action', header: '', width: '70px', align: 'right', cell: () => <span className="text-xs font-semibold text-brand-blue">수정</span> },
  ];

  return (
    <>
      <PageHeader
        title="포트폴리오"
        description="홈페이지 포트폴리오를 등록·수정합니다. 새 항목은 목록 맨 앞에 보입니다."
        actions={
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={() => setOrdering(true)}>
              순서 편집
            </button>
            <button type="button" className={`${primaryButton} inline-flex items-center gap-1`} onClick={() => setEditing('new')}>
              <Plus size={16} /> 등록
            </button>
          </div>
        }
      />

      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
        <select
          value={category}
          onChange={(e) => {
            setPage(0);
            setCategory(e.target.value as PortfolioCategory | '');
          }}
          className={`${fieldClass} w-36`}
          aria-label="분류"
        >
          <option value="">전체 분류</option>
          {PORTFOLIO_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {PORTFOLIO_CATEGORY_LABEL[value]}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="search"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="제목 검색"
            className={`${fieldClass} w-64 pl-9`}
          />
        </div>
        <button type="submit" className={primaryButton}>
          검색
        </button>
        {data && <span className="text-xs text-brand-gray-500">전체 {data.totalElements.toLocaleString()}건</span>}
      </form>

      <ErrorBanner>{error && errorText(error, '포트폴리오를 불러오지 못했습니다.')}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={data?.content ?? []}
        rowKey={(p) => p.id}
        loading={isLoading}
        empty="등록된 포트폴리오가 없습니다."
        onRowClick={(p) => setEditing(p)}
      />
      <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />

      {editing && (
        <PortfolioFormModal
          target={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void mutate();
          }}
        />
      )}
      {ordering && (
        <PortfolioOrderModal
          onClose={() => setOrdering(false)}
          onSaved={() => {
            setOrdering(false);
            void mutate();
          }}
        />
      )}
    </>
  );
}

function PortfolioFormModal({ target, onClose, onSaved }: { target: AdminPortfolio | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(target?.title ?? '');
  const [category, setCategory] = useState<PortfolioCategory>(target?.category ?? 'HOSPITAL');
  const [description, setDescription] = useState(target?.description ?? '');
  const [visible, setVisible] = useState(target?.visible ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  /** 업로드에 성공한 키를 선택한 파일 기준으로 기억해, 등록이 실패한 뒤 다시 저장할 때 재사용한다. */
  const uploaded = useRef<{ file: File; imageKey?: string; thumbnailKey?: string } | null>(null);
  const preview = pickedUrl ?? target?.imageUrl ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(
    () => () => {
      if (pickedUrl) URL.revokeObjectURL(pickedUrl);
    },
    [pickedUrl],
  );

  const pickFile = (next: File | null) => {
    setFile(next);
    uploaded.current = null;
    setPickedUrl(next ? URL.createObjectURL(next) : null);
  };

  const save = async () => {
    if (!title.trim()) return setMessage('제목을 입력해주세요.');
    if (!target && !file) return setMessage('이미지를 선택해주세요.');
    setMessage('');
    try {
      let imageKey = target?.imageKey ?? '';
      let thumbnailKey = target?.thumbnailKey ?? '';
      if (file) {
        if (uploaded.current?.file !== file) uploaded.current = { file };
        const done = uploaded.current;
        setBusy('이미지 올리는 중…');
        done.imageKey ??= (await uploadContentImage(file, 'PORTFOLIO', { maxEdge: 1600 })).key;
        done.thumbnailKey ??= (await uploadContentImage(file, 'PORTFOLIO', { maxEdge: 600, thumbnail: true })).key;
        imageKey = done.imageKey;
        thumbnailKey = done.thumbnailKey;
      }
      setBusy('저장 중…');
      const request = { title: title.trim(), category, description: description.trim() || null, imageKey, thumbnailKey, visible };
      if (target) await AdminContentService.updatePortfolio(target.id, request);
      else await AdminContentService.createPortfolio(request);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '저장하지 못했습니다.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!target || !confirm(`"${target.title}"을(를) 삭제할까요? 이미지도 함께 지워집니다.`)) return;
    setBusy('삭제 중…');
    try {
      await AdminContentService.deletePortfolio(target.id);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '삭제하지 못했습니다.'));
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={target ? '포트폴리오 수정' : '포트폴리오 등록'}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {target && (
              <button type="button" className={dangerButton} onClick={remove} disabled={!!busy}>
                삭제
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {busy && <span className="text-xs text-brand-gray-500">{busy}</span>}
            <button type="button" className={secondaryButton} onClick={onClose} disabled={!!busy}>
              취소
            </button>
            <button type="button" className={primaryButton} onClick={save} disabled={!!busy}>
              저장
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <FormField label="제목" htmlFor="portfolio-title" required hint="정류장명 등. 100자 이하">
            <input id="portfolio-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputClass} />
          </FormField>
          <FormField label="분류" htmlFor="portfolio-category" required>
            <select id="portfolio-category" value={category} onChange={(e) => setCategory(e.target.value as PortfolioCategory)} className={inputClass}>
              {PORTFOLIO_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {PORTFOLIO_CATEGORY_LABEL[value]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="설명" htmlFor="portfolio-description" hint="상세 화면에 빨간 글씨로 보입니다. 예: 하루 799회 반복으로 단독 송출">
            <textarea
              id="portfolio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className={inputClass}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-brand-gray-700">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            홈페이지에 노출
          </label>
        </div>
        <FormField label="이미지" htmlFor="portfolio-image" required={!target} hint="원본(긴 변 1600px)과 썸네일(600px)을 WebP로 줄여 올립니다.">
          <div className="space-y-2">
            <div className="flex aspect-[1.85/1] items-center justify-center overflow-hidden rounded-md border border-dashed border-brand-gray-300 bg-brand-gray-50">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- 미리보기
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-brand-gray-400">이미지를 선택하세요</span>
              )}
            </div>
            <input
              id="portfolio-image"
              type="file"
              accept="image/webp,image/jpeg,image/png"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs"
            />
          </div>
        </FormField>
      </div>
      <div className="mt-4">
        <ErrorBanner>{message}</ErrorBanner>
      </div>
    </Modal>
  );
}

/** 전체 포트폴리오를 불러와 순서를 바꾸고 한 번에 저장한다. */
function PortfolioOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<AdminPortfolio[] | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: AdminPortfolio[] = [];
        for (let p = 0; ; p += 1) {
          const result = await AdminContentService.portfolios({ page: p, size: 100 });
          all.push(...result.content);
          if (p + 1 >= result.totalPages) break;
        }
        if (!cancelled) setItems(all);
      } catch (error) {
        if (!cancelled) setMessage(errorText(error, '목록을 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!items) return;
    setSaving(true);
    try {
      await AdminContentService.reorderPortfolios(items.map((item) => item.id));
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '순서를 저장하지 못했습니다.'));
      setSaving(false);
    }
  };

  const iconButton = 'rounded p-1 text-brand-gray-500 hover:bg-brand-gray-100 disabled:opacity-30';

  /** 입력한 위치 번호(1부터)로 옮긴다. 범위를 벗어나면 끝으로 맞추고, 숫자가 아니면 원래 번호로 되돌린다. */
  const commitPosition = (input: HTMLInputElement, index: number) => {
    const wanted = Math.trunc(Number(input.value));
    if (!items || !Number.isFinite(wanted) || input.value.trim() === '') {
      input.value = String(index + 1);
      return;
    }
    const target = Math.min(Math.max(wanted, 1), items.length) - 1;
    if (target === index) {
      input.value = String(index + 1);
      return;
    }
    setItems(moveItem(items, index, target));
  };

  return (
    <Modal
      open
      onClose={saving ? () => undefined : onClose}
      title="포트폴리오 순서 편집"
      size="lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className={primaryButton} onClick={save} disabled={!items || saving}>
            순서 저장
          </button>
        </div>
      }
    >
      <ErrorBanner>{message}</ErrorBanner>
      {items && <p className="mb-2 text-xs text-brand-gray-500">왼쪽 번호 칸에 위치를 입력하고 Enter를 누르면 그 자리로 옮깁니다.</p>}
      {!items && !message && <p className="py-8 text-center text-sm text-brand-gray-500">불러오는 중…</p>}
      {items && (
        <ol className="max-h-[60vh] divide-y divide-brand-gray-100 overflow-y-auto rounded-md border border-brand-gray-200">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <input
                key={`${item.id}-${index}`}
                type="number"
                min={1}
                max={items.length}
                defaultValue={index + 1}
                aria-label={`${item.title} 위치 번호`}
                onBlur={(e) => commitPosition(e.currentTarget, index)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="w-14 rounded border border-brand-gray-200 px-1 py-0.5 text-right text-xs text-brand-gray-700 focus:border-brand-blue focus:outline-none"
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- 저장소 공개 URL */}
              <img src={item.thumbnailUrl} alt="" className="h-9 w-16 rounded object-cover" />
              <span className="flex-1 truncate text-sm">{item.title}</span>
              {!item.visible && <VisibilityBadge visible={false} />}
              <button type="button" className={iconButton} onClick={() => setItems(moveItem(items, index, 0))} disabled={index === 0} aria-label="맨 위로">
                <ChevronsUp size={16} />
              </button>
              <button type="button" className={iconButton} onClick={() => setItems(moveItem(items, index, index - 1))} disabled={index === 0} aria-label="위로">
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => setItems(moveItem(items, index, index + 1))}
                disabled={index === items.length - 1}
                aria-label="아래로"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => setItems(moveItem(items, index, items.length - 1))}
                disabled={index === items.length - 1}
                aria-label="맨 아래로"
              >
                <ChevronsDown size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
