/**
 * 백엔드 ApiResponse.code 카탈로그.
 *
 * 단일 진실 원천은 백엔드 `Result` enum / 각 서비스 Swagger 응답이며,
 * 본 파일은 프론트에서 자주 분기하는 코드만 상수화해 둔다.
 * 누락된 코드를 발견하면 백엔드와 합의 후 본 파일에 보강한다.
 */

export const RESULT_CODES = {
  SUCCESS: '00000',

  AUTH_INVALID_CREDENTIALS: '00301',
  AUTH_TOKEN_EXPIRED: '00302',
  AUTH_TOKEN_INVALID: '00303',
  AUTH_EMAIL_NOT_VERIFIED: '00304',
  AUTH_ACCOUNT_LOCKED: '00305',
  AUTH_ACCOUNT_DEACTIVATED: '00306',

  VALIDATION_FAIL: '00400',
  VALIDATION_FAIL_FIELD: '00260',
  FORBIDDEN: '00403',
  NOT_FOUND: '00404',

  AUTH_EMAIL_NOT_REGISTERED: '00310',

  RESERVATION_CONFLICT: '20001',
  RESERVATION_NOT_CANCELABLE: '20002',
  CONTRACT_NOT_FOUND: '30001',
  CONTRACT_NOT_SIGNABLE: '30002',
  CONTRACT_NOT_PAYABLE: '30003',
  CONTRACT_RENEWAL_DENIED: '30004',
  STOP_NOT_FOUND: '40001',
  STOP_DELETE_LOCKED: '40002',
  STOP_PRICE_LOCKED: '40010',

  INTERNAL_ERROR: '99999',
} as const;

export type ResultCode = (typeof RESULT_CODES)[keyof typeof RESULT_CODES];

export const RESULT_CODE_MESSAGES: Record<string, string> = {
  [RESULT_CODES.AUTH_INVALID_CREDENTIALS]: '이메일 또는 비밀번호가 일치하지 않습니다.',
  [RESULT_CODES.AUTH_TOKEN_EXPIRED]: '세션이 만료되었습니다. 다시 로그인해주세요.',
  [RESULT_CODES.AUTH_EMAIL_NOT_VERIFIED]: '이메일 인증이 필요합니다.',
  [RESULT_CODES.AUTH_ACCOUNT_LOCKED]: '계정이 잠겼습니다. 관리자에게 문의해주세요.',
  [RESULT_CODES.AUTH_ACCOUNT_DEACTIVATED]: '비활성화된 계정입니다. 재활성화가 필요합니다.',
  [RESULT_CODES.FORBIDDEN]: '이 작업을 수행할 권한이 없습니다.',
  [RESULT_CODES.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [RESULT_CODES.RESERVATION_CONFLICT]: '해당 시간대에 이미 예약이 존재합니다.',
  [RESULT_CODES.RESERVATION_NOT_CANCELABLE]: 'PENDING 상태의 예약만 취소 가능합니다.',
  [RESULT_CODES.CONTRACT_NOT_SIGNABLE]: '이미 서명된 계약입니다.',
  [RESULT_CODES.CONTRACT_NOT_PAYABLE]: '결제 가능한 상태가 아닙니다.',
  [RESULT_CODES.CONTRACT_RENEWAL_DENIED]: '갱신할 수 없는 계약입니다.',
  [RESULT_CODES.STOP_DELETE_LOCKED]: '활성 계약이 있는 정류장은 삭제할 수 없습니다.',
  [RESULT_CODES.STOP_PRICE_LOCKED]: '적용 중이거나 적용 완료된 단가는 수정/삭제할 수 없습니다.',
};

export const messageForCode = (code: string, fallback: string): string =>
  RESULT_CODE_MESSAGES[code] ?? fallback;

export const isSuccess = (code: string): boolean => code === RESULT_CODES.SUCCESS;

interface FieldError {
  field: string;
  message: string;
}

type AxiosLikeError = {
  response?: {
    data?: {
      code?: string;
      message?: string;
      data?: unknown;
      errors?: unknown;
    };
  };
};

/**
 * axios 에러에서 사용자에게 보여줄 메시지를 추출한다.
 * 서버가 `errors` 또는 `data` 필드에 FieldErrorDetail[] 를 담아 보내는 경우(code 00260 등)
 * 필드별 메시지를 줄 구분하여 반환하고, 없으면 code → message → fallback 순으로 반환한다.
 */
export const extractApiError = (e: unknown, fallback: string): string => {
  const res = (e as AxiosLikeError).response?.data;
  if (!res) return fallback;

  const fieldErrors = Array.isArray(res.errors)
    ? (res.errors as FieldError[])
    : Array.isArray(res.data)
      ? (res.data as FieldError[])
      : [];

  if (fieldErrors.length > 0) {
    const messages = fieldErrors.map((fe) => fe.message).filter(Boolean);
    if (messages.length > 0) return messages.join('\n');
  }

  return messageForCode(res.code ?? '', res.message ?? fallback);
};
