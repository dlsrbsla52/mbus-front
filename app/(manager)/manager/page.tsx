'use client';

import {
  CalendarClock,
  CircleDollarSign,
  FileSignature,
  MapPin,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerDashboardPage() {
  return (
    <>
      <PageHeader
        title="대시보드"
        description="영업 현황과 핵심 지표를 한 눈에 확인하세요."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="이번 달 신규 계약"
          value="—"
          icon={<FileSignature className="h-5 w-5" />}
          hint="통계 API 연결 대기"
        />
        <StatCard
          label="진행 중 예약"
          value="—"
          icon={<CalendarClock className="h-5 w-5" />}
          hint="통계 API 연결 대기"
        />
        <StatCard
          label="등록 정류장"
          value="—"
          icon={<MapPin className="h-5 w-5" />}
          hint="통계 API 연결 대기"
        />
        <StatCard
          label="이번 달 예상 매출"
          value="—"
          icon={<CircleDollarSign className="h-5 w-5" />}
          hint="통계 API 연결 대기"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-brand-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-brand-black">최근 계약</h2>
          <div className="mt-3">
            <EmptyState
              title="아직 표시할 계약이 없습니다."
              description="GET /api/v1/admin/contract 가 연결되면 표시됩니다."
            />
          </div>
        </div>
        <div className="rounded-lg border border-brand-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-brand-black">갱신 예정</h2>
          <div className="mt-3">
            <EmptyState
              title="만료 1개월 이내 계약이 없습니다."
              description="GET /api/v1/admin/contract?within=30d 가 연결되면 표시됩니다."
            />
          </div>
        </div>
      </section>
    </>
  );
}
