/** 공개 사이트 날짜 표기(YYYY-MM-DD, 한국 시간). 백엔드 OffsetDateTime 문자열을 받는다. */
export const formatSiteDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(date);
};
