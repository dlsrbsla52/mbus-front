'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Modal from '@/components/common/Modal';
import FormField from '@/components/common/FormField';
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABEL, type FaqCategory } from '@/lib/api/content-model';
import { AdminContentService, type AdminFaq } from '@/lib/api/admin/content';
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

/** 관리자 FAQ: 문답 목록 · 등록/수정 · 삭제 · 순서 변경(위·아래 이동 후 저장). */
export default function FaqManager() {
  const { data, error, isLoading, mutate } = useSWR(['admin-faqs'], () => AdminContentService.faqs());
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const order = useMemo(() => {
    if (!data) return [];
    if (!orderIds) return data;
    const byId = new Map(data.map((faq) => [faq.id, faq]));
    const arranged = orderIds.flatMap((id) => byId.get(id) ?? []);
    const arrangedIds = new Set(orderIds);
    return [...arranged, ...data.filter((faq) => !arrangedIds.has(faq.id))];
  }, [data, orderIds]);

  const dirty = !!data && orderIds !== null && order.map((f) => f.id).join() !== data.map((f) => f.id).join();

  const saveOrder = async () => {
    setSaving(true);
    setMessage('');
    try {
      await AdminContentService.reorderFaqs(order.map((f) => f.id));
      await mutate();
      setOrderIds(null);
    } catch (err) {
      setMessage(errorText(err, '순서를 저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const iconButton = 'rounded p-1 text-brand-gray-500 hover:bg-brand-gray-100 disabled:opacity-30';

  return (
    <>
      <PageHeader
        title="FAQ"
        description="홈페이지 고객센터 FAQ를 문답 단위로 관리합니다. 화살표로 순서를 바꾼 뒤 저장하세요."
        actions={
          <div className="flex gap-2">
            {dirty && (
              <>
                <button type="button" className={secondaryButton} onClick={() => setOrderIds(null)} disabled={saving}>
                  순서 되돌리기
                </button>
                <button type="button" className={primaryButton} onClick={saveOrder} disabled={saving}>
                  순서 저장
                </button>
              </>
            )}
            <button type="button" className={`${primaryButton} inline-flex items-center gap-1`} onClick={() => setEditing('new')}>
              <Plus size={16} /> 등록
            </button>
          </div>
        }
      />
      <ErrorBanner>{(error && errorText(error, 'FAQ를 불러오지 못했습니다.')) || message}</ErrorBanner>
      {isLoading && <p className="py-10 text-center text-sm text-brand-gray-500">불러오는 중…</p>}
      {data && order.length === 0 && <p className="py-10 text-center text-sm text-brand-gray-500">등록된 FAQ가 없습니다.</p>}
      <ol className="divide-y divide-brand-gray-100 rounded-lg border border-brand-gray-200 bg-white">
        {order.map((faq, index) => (
          <li key={faq.id} className="flex items-start gap-3 px-4 py-3">
            <span className="w-6 pt-0.5 text-right text-xs text-brand-gray-400">{index + 1}</span>
            <button type="button" onClick={() => setEditing(faq)} className="flex-1 text-left">
              <p className="text-sm font-semibold text-brand-black">
                <span className="mr-2 text-xs font-normal text-brand-blue">[{FAQ_CATEGORY_LABEL[faq.category]}]</span>
                {faq.question}
              </p>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-brand-gray-500">{faq.answer}</p>
            </button>
            {!faq.visible && <VisibilityBadge visible={false} />}
            <button type="button" className={iconButton} onClick={() => setOrderIds(moveItem(order, index, index - 1).map((f) => f.id))} disabled={index === 0} aria-label="위로">
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              className={iconButton}
              onClick={() => setOrderIds(moveItem(order, index, index + 1).map((f) => f.id))}
              disabled={index === order.length - 1}
              aria-label="아래로"
            >
              <ArrowDown size={16} />
            </button>
          </li>
        ))}
      </ol>
      {editing && (
        <FaqFormModal
          target={editing === 'new' ? null : editing}
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

function FaqFormModal({ target, onClose, onSaved }: { target: AdminFaq | null; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<FaqCategory>(target?.category ?? 'MEDIA');
  const [question, setQuestion] = useState(target?.question ?? '');
  const [answer, setAnswer] = useState(target?.answer ?? '');
  const [visible, setVisible] = useState(target?.visible ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    if (!question.trim() || !answer.trim()) return setMessage('질문과 답변을 입력해주세요.');
    setBusy(true);
    setMessage('');
    try {
      const request = { category, question: question.trim(), answer, visible };
      if (target) await AdminContentService.updateFaq(target.id, request);
      else await AdminContentService.createFaq(request);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '저장하지 못했습니다.'));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!target || !confirm('이 FAQ를 삭제할까요?')) return;
    setBusy(true);
    try {
      await AdminContentService.deleteFaq(target.id);
      onSaved();
    } catch (error) {
      setMessage(errorText(error, '삭제하지 못했습니다.'));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={target ? 'FAQ 수정' : 'FAQ 등록'}
      size="lg"
      footer={
        <div className="flex w-full justify-between gap-2">
          <div>
            {target && (
              <button type="button" className={dangerButton} onClick={remove} disabled={busy}>
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
              취소
            </button>
            <button type="button" className={primaryButton} onClick={save} disabled={busy}>
              저장
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="분류" htmlFor="faq-category" required>
          <select id="faq-category" value={category} onChange={(e) => setCategory(e.target.value as FaqCategory)} className={`${fieldClass} w-56`}>
            {FAQ_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {FAQ_CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="질문" htmlFor="faq-question" required>
          <input id="faq-question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} className={inputClass} />
        </FormField>
        <FormField label="답변" htmlFor="faq-answer" required hint="줄바꿈이 그대로 보입니다.">
          <textarea id="faq-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} maxLength={10000} className={inputClass} />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-brand-gray-700">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          홈페이지에 노출
        </label>
        <ErrorBanner>{message}</ErrorBanner>
      </div>
    </Modal>
  );
}
