const KST_OFFSET = '+09:00';

/**
 * date picker 값(YYYY-MM-DD)을 LocalDate 문자열로 변환한다.
 * 백엔드 DTO의 LocalDate 타입 필드에 사용.
 */
export function toApiLocalDate(value: string): string {
  return value.slice(0, 10);
}

/**
 * date picker 값(YYYY-MM-DD)과 시각 문자열(HH:mm:ss)을 OffsetDateTime 문자열로 변환한다.
 * 백엔드 DTO의 OffsetDateTime 타입 필드에 사용.
 * 한국 운영 기준 오프셋(+09:00)을 고정 적용한다.
 */
export function toApiOffsetDateTime(dateStr: string, time = '00:00:00'): string {
  return `${dateStr.slice(0, 10)}T${time}${KST_OFFSET}`;
}

/**
 * 백엔드 OffsetDateTime 응답값을 Date 객체로 변환한다.
 * 표시용(toLocaleString 등) 변환에 사용.
 */
export function fromApiOffsetDateTime(value: string): Date {
  return new Date(value);
}
