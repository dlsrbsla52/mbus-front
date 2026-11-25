'use client';

import { useState, type FormEvent } from 'react';

interface BoardSearchProps<T extends string> {
  options: { value: T; label: string }[];
  initialField: T;
  initialKeyword?: string;
  onSearch: (field: T, keyword: string) => void;
}

/** 기존 사이트 게시판 하단 검색(검색 대상 선택 + 검색어 + 검색 버튼). */
export default function BoardSearch<T extends string>({ options, initialField, initialKeyword = '', onSearch }: BoardSearchProps<T>) {
  const [field, setField] = useState<T>(initialField);
  const [keyword, setKeyword] = useState(initialKeyword);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(field, keyword.trim());
  };

  const control = 'h-10 border border-[#ccc] bg-white px-3 text-[13px] text-[#333]';

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-1.5" role="search">
      <select value={field} onChange={(e) => setField(e.target.value as T)} className={control} aria-label="검색 대상">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        maxLength={100}
        className={`${control} w-[160px] sm:w-[200px]`}
        aria-label="검색어"
      />
      <button type="submit" className={`${control} px-5 hover:bg-[#f2f2f2]`}>
        검색
      </button>
    </form>
  );
}
