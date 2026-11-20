import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';
import { toStop, type BusStopResponseRaw, type Stop, type StopListParams } from './stop-model';

export const StopService = {
  /** 공개 정류소 목록 조회. 매니저 외 일반/비즈니스 회원도 사용(예: 예약 생성 시 정류장 선택). */
  list: (params: StopListParams = {}): Promise<PageResult<Stop>> =>
    api
      .get<ApiResponse<BackendPage<BusStopResponseRaw>>>('/api/v1/stop', { params })
      .then((res) => toPageResult(res.data.data, toStop)),
};
