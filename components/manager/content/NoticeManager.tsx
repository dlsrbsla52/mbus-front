'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import Modal from '@/components/common/Modal';
import FormField from '@/components/common/FormField';
import { AdminContentService, uploadContentImage, type AdminNotice, type AdminNoticeSummary } from '@/lib/api/admin/content';
import { toApiOffsetDateTime } from '@/lib/api/date-serializer';
import { formatSiteDate } from '@/components/site/format';
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
const MAX_IMAGES = 10;

/** 첨부 이미지 편집 항목: 이미 올라간 이미지(key) 또는 저장할 때 올릴 새 파일 */
type ImageItem = { kind: 'saved'; key: string; url: string } | { kind: 'new'; file: File; url: string };

/** 관리자 공지사항: 목록(숨김 포함) · 등록/수정(본문 텍스트 + 이미지 최대 10장) · 삭제. */
export default function NoticeManager() {
  const [page, setPage] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const { data, error, isLoading, mutate } = useSWR(['admin-notices', keyword, page], () =>
    AdminContentService.notices({ keyword: keyword || undefined, page, size: PAGE_SIZE }),
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const columns: DataTableColumn<AdminNoticeSummary>[] = [
    {
      key: 'title',
      header: '제목',
      cell: (n) => (
        <span className="font-semibold text-brand-black">
          {n.pinned && <span className="mr-2 rounded bg-brand-blue-soft px-1.5 py-0.5 text-xs text-brand-blue">고정</span>}
          {n.title}
        </span>
      ),
    },
    { key: 'visible', header: '노출', width: '80px', align: 'center', cell: (n) => <VisibilityBadge visible={n.visible} /> },
    { key: 'views', header: '조회수', width: '80px', align: 'right', cell: (n) => n.viewCount.toLocaleString() },
    { key: 'date', header: '게시일', width: '110px', align: 'center', cell: (n) => formatSiteDate(n.publishedAt) },
  ];

  return (
    <>
      <PageHeader
        title="공지사항"
        description="홈페이지 고객센터 공지사항을 등록·수정합니다. 고정 글은 목록 맨 위에 보입니다."
        actions={
          <button type="button" className={`${primaryButton} inline-flex items-center gap-1`} onClick={() => setEditing('new')}>
            <Plus size={16} /> 등록
          </button>
        }
      />
      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-400" />
          <input type="search" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} placeholder="제목 검색" className={`${fieldClass} w-64 pl-9`} />
        </div>
        <button type="submit" className={primaryButton}>
          검색
        </button>
      </form>
      <ErrorBanner>{error && errorText(error, '공지사항을 불러오지 못했습니다.')}</ErrorBanner>
      <DataTable
        columns={columns}
        rows={data?.content ?? []}
        rowKey={(n) => n.id}
        loading={isLoading}
        empty="등록된 공지사항이 없습니다."
        onRowClick={(n) => setEditing(n.id)}
      />
      <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
      {editing && (
        <NoticeFormModal
          id={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void mutate();
          }}
        />
      )}
    </>
  );
}

/**
 * 수정할 공지를 불러온 뒤 편집 폼을 연다. 폼의 초기값은 불러온 공지에서 한 번만 가져온다.
 * 저장·삭제하면 상세 캐시를 비우고, 캐시된 값으로 먼저 열렸더라도 재검증된 최신 값(`updatedAt`)이 오면 편집기를 다시 마운트한다.
 */
function NoticeFormModal({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const {
    data: notice,
    error: loadError,
    mutate: mutateDetail,
  } = useSWR(id ? ['admin-notice', id] : null, () => AdminContentService.notice(id as string), {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    dedupingInterval: 0,
  });

  const handleSaved = () => {
    void mutateDetail(undefined, { revalidate: false });
    onSaved();
  };

  if (id && !notice) {
    return (
      <Modal open onClose={onClose} title="공지사항 수정" size="xl">
        {loadError ? (
          <ErrorBanner>{errorText(loadError, '공지사항을 불러오지 못했습니다.')}</ErrorBanner>
        ) : (
          <p className="py-10 text-center text-sm text-brand-gray-500">불러오는 중…</p>
        )}
      </Modal>
    );
  }
  return <NoticeEditor key={notice?.updatedAt ?? 'new'} id={id} notice={notice ?? null} onClose={onClose} onSaved={handleSaved} />;
}

function NoticeEditor({ id, notice, onClose, onSaved }: { id: string | null; notice: AdminNotice | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [pinned, setPinned] = useState(notice?.pinned ?? false);
  const [visible, setVisible] = useState(notice?.visible ?? true);
  const initialDate = notice ? formatSiteDate(notice.publishedAt) : '';
  const [publishedDate, setPublishedDate] = useState(initialDate);
  const [images, setImages] = useState<ImageItem[]>(
    () => notice?.images.map((image): ImageItem => ({ kind: 'saved', key: image.key, url: image.url })) ?? [],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files).map((file): ImageItem => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { kind: 'new', file, url };
    });
    setImages((current) => [...current, ...added].slice(0, MAX_IMAGES));
  };

  const save = async () => {
    if (!title.trim() || !body.trim()) return setMessage('제목과 본문을 입력해주세요.');
    setMessage('');
    try {
      const keys: string[] = [];
      for (const [index, image] of images.entries()) {
        if (image.kind === 'saved') keys.push(image.key);
        else {
          setBusy(`이미지 올리는 중… (${index + 1}/${images.length})`);
          const uploaded = await uploadContentImage(image.file, 'NOTICE', { maxEdge: 1600 });
          const saved: ImageItem = { kind: 'saved', key: uploaded.key, url: image.url };
          setImages((current) => current.map((item) => (item === image ? saved : item)));
          keys.push(uploaded.key);
        }
      }
      setBusy('저장 중…');
      const request = {
        title: title.trim(),
        body,
        pinned,
        visible,
        publishedAt: publishedDate && publishedDate !== initialDate ? toApiOffsetDateTime(publishedDate, '09:00:00') : null,
        imageKeys: keys,
      };
      if (id) await AdminContentService.updateNotice(id, request);
      else await AdminContentService.createNotice(request);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '저장하지 못했습니다.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!id || !confirm('이 공지사항을 삭제할까요? 첨부 이미지도 함께 지워집니다.')) return;
    setBusy('삭제 중…');
    try {
      await AdminContentService.deleteNotice(id);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '삭제하지 못했습니다.'));
      setBusy(null);
    }
  };

  const iconButton = 'rounded bg-white/90 p-1 text-brand-gray-600 shadow hover:bg-white disabled:opacity-30';

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={id ? '공지사항 수정' : '공지사항 등록'}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {id && (
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
            <button type="button" className={primaryButton} onClick={save} disabled={!!busy || (!!id && !notice)}>
              저장
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="제목" htmlFor="notice-title" required>
          <input id="notice-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={inputClass} />
        </FormField>
        <FormField label="본문" htmlFor="notice-body" required hint="줄바꿈이 그대로 보입니다. 이미지는 본문 아래에 순서대로 표시됩니다.">
          <textarea id="notice-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={20000} className={inputClass} />
        </FormField>
        <div className="flex flex-wrap items-end gap-6">
          <FormField label="게시일" htmlFor="notice-date" hint="비우면 새 글은 등록 시각, 수정은 기존 게시 시각 유지">
            <input id="notice-date" type="date" value={publishedDate} onChange={(e) => setPublishedDate(e.target.value)} className={`${fieldClass} w-44`} />
          </FormField>
          <label className="flex items-center gap-2 pb-2 text-sm text-brand-gray-700">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            상단 고정
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-brand-gray-700">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            홈페이지에 노출
          </label>
        </div>
        <FormField label={`이미지 (${images.length}/${MAX_IMAGES})`} htmlFor="notice-images" hint="긴 변 1600px WebP로 줄여 저장할 때 올립니다.">
          <div className="space-y-3">
            {images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <li key={image.url} className="relative overflow-hidden rounded-md border border-brand-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 미리보기 */}
                    <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white">{index + 1}</span>
                    <div className="absolute right-1 top-1 flex gap-1">
                      <button type="button" className={iconButton} onClick={() => setImages(moveItem(images, index, index - 1))} disabled={index === 0} aria-label="앞으로">
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => setImages(moveItem(images, index, index + 1))}
                        disabled={index === images.length - 1}
                        aria-label="뒤로"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" className={iconButton} onClick={() => setImages(images.filter((_, i) => i !== index))} aria-label="빼기">
                        <X size={14} />
                      </button>
                    </div>
                    {image.kind === 'new' && <span className="absolute bottom-1 left-1 rounded bg-brand-blue px-1.5 text-xs text-white">새 이미지</span>}
                  </li>
                ))}
              </ul>
            )}
            <input
              id="notice-images"
              type="file"
              multiple
              accept="image/webp,image/jpeg,image/png"
              disabled={images.length >= MAX_IMAGES}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
              className="block text-xs"
            />
          </div>
        </FormField>
        <ErrorBanner>{message}</ErrorBanner>
      </div>
    </Modal>
  );
}
