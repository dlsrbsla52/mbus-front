'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ChevronDown } from 'lucide-react';
import { ContentService } from '@/lib/api/content';
import { FAQ_CATEGORY_LABEL } from '@/lib/api/content-model';
import { extractApiError } from '@/lib/api/result-codes';
import BoardSearch from '@/components/site/board/BoardSearch';

type FaqField = 'QUESTION' | 'ANSWER';

/** FAQ: 질문 행을 누르면 답변이 펼쳐진다. 검색은 받아 온 목록 안에서 거른다. */
export default function FaqList() {
  const { data, error, isLoading } = useSWR(['faqs'], () => ContentService.faqs());
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ field: FaqField; keyword: string }>({ field: 'QUESTION', keyword: '' });

  const items = useMemo(() => {
    const keyword = filter.keyword.toLowerCase();
    if (!keyword) return data ?? [];
    return (data ?? []).filter((faq) => (filter.field === 'QUESTION' ? faq.question : faq.answer).toLowerCase().includes(keyword));
  }, [data, filter]);

  return (
    <div>
      <ul className="border-t border-[#333]">
        {isLoading && <li className="py-14 text-center text-[14px] text-[#999]">불러오는 중…</li>}
        {error && <li className="py-14 text-center text-[14px] text-[#999]">{extractApiError(error, 'FAQ를 불러오지 못했습니다.')}</li>}
        {data && items.length === 0 && <li className="py-14 text-center text-[14px] text-[#999]">등록된 FAQ가 없습니다.</li>}
        {items.map((faq) => {
          const open = openId === faq.id;
          return (
            <li key={faq.id} className="border-b border-[#ddd]">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : faq.id)}
                aria-expanded={open}
                className="grid w-full grid-cols-[80px_1fr_24px] items-center text-left text-[14px] md:grid-cols-[200px_1fr_32px]"
              >
                <span className="self-stretch bg-[#f5f5f5] px-3 py-4 text-center text-[#555]">질문</span>
                <span className="px-4 py-4 text-[#222]">
                  <span className="mr-2 text-[12px] text-site-navy">[{FAQ_CATEGORY_LABEL[faq.category]}]</span>
                  {faq.question}
                </span>
                <ChevronDown size={16} className={`text-[#999] transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="grid grid-cols-[80px_1fr] border-t border-[#eee] text-[14px] md:grid-cols-[200px_1fr]">
                  <span className="bg-[#fafafa] px-3 py-4 text-center text-[#555]">답변</span>
                  <p className="whitespace-pre-line break-keep px-4 py-4 leading-7 text-[#444]">{faq.answer}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-8">
        <BoardSearch<FaqField>
          options={[
            { value: 'QUESTION', label: '질문' },
            { value: 'ANSWER', label: '답변' },
          ]}
          initialField="QUESTION"
          onSearch={(field, keyword) => setFilter({ field, keyword })}
        />
      </div>
    </div>
  );
}
