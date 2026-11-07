import Link from 'next/link';
import { STOP_TYPE_LABEL, type Stop } from '@/lib/api/stop';

/** 정류장 상세 필드 표시부. 목록 모달과 `/manager/stop/[id]` 페이지가 공유한다. */
export default function StopDetailFields({ stop }: { stop: Stop }) {
  return (
    <>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="ARS ID" value={stop.arsId} mono />
        <Field label="노드 ID" value={stop.nodeId} mono />
        <Field label="정류장 이름" value={stop.name} />
        <Field label="정류소 유형" value={STOP_TYPE_LABEL[stop.stopsType]} />
        <Field label="위도 (latitude)" value={stop.latitude.toFixed(6)} mono />
        <Field label="경도 (longitude)" value={stop.longitude.toFixed(6)} mono />
        <Field label="등록일시" value={new Date(stop.createdAt).toLocaleString('ko-KR')} />
        <Field label="수정일시" value={new Date(stop.updatedAt).toLocaleString('ko-KR')} />
      </dl>

      <p className="mt-6 rounded-md border border-brand-gray-200 bg-brand-gray-50 px-3 py-2 text-xs text-brand-gray-500">
        정류장 정보 수정·삭제 API는 아직 제공되지 않습니다.{' '}
        <Link
          href={`/manager/stop-price?stopId=${encodeURIComponent(stop.id)}`}
          className="font-semibold text-brand-blue hover:underline"
        >
          이 정류장의 단가 관리로 이동
        </Link>
      </p>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-brand-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm text-brand-black ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
