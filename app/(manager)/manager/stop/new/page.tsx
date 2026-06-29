'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Database, MapPin } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import FormField, { TextInput } from '@/components/common/FormField';
import { StopService } from '@/lib/api/stop';
import { extractApiError } from '@/lib/api/result-codes';

const schema = z.object({
  arsId: z.string().min(1, 'ARS ID 를 입력하세요.'),
  name: z.string().min(1, '정류장 이름을 입력하세요.'),
  latitude: z
    .number({ message: '위도를 입력하세요.' })
    .min(-90, '위도는 -90 ~ 90 사이여야 합니다.')
    .max(90, '위도는 -90 ~ 90 사이여야 합니다.'),
  longitude: z
    .number({ message: '경도를 입력하세요.' })
    .min(-180, '경도는 -180 ~ 180 사이여야 합니다.')
    .max(180, '경도는 -180 ~ 180 사이여야 합니다.'),
  district: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Tab = 'single' | 'bulk';

export default function ManagerStopNewPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('single');

  return (
    <>
      <PageHeader
        title="정류장 등록"
        description="단건 직접 등록 또는 공공 API 일괄 등록을 선택해 진행합니다."
        actions={
          <Link
            href="/manager/stop"
            className="rounded-md border border-brand-gray-300 px-3 py-2 text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            ← 목록으로
          </Link>
        }
      />

      <div className="flex border-b border-brand-gray-200">
        <TabButton active={tab === 'single'} onClick={() => setTab('single')} icon={<MapPin className="h-4 w-4" />}>
          단건 등록
        </TabButton>
        <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')} icon={<Database className="h-4 w-4" />}>
          공공 API 대량 등록
        </TabButton>
      </div>

      {tab === 'single' ? <SingleForm onCreated={() => router.replace('/manager/stop')} /> : <BulkPanel />}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'inline-flex items-center gap-1.5 border-b-2 border-brand-black px-4 py-2.5 text-sm font-bold text-brand-black'
          : 'inline-flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-brand-gray-500 hover:text-brand-black'
      }
    >
      {icon}
      {children}
    </button>
  );
}

function SingleForm({ onCreated }: { onCreated: () => void }) {
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('');
      await StopService.createSimple(data);
      onCreated();
    } catch (e) {
      setServerError(extractApiError(e, '등록에 실패했습니다.'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4 rounded-lg border border-brand-gray-200 bg-white p-6">
      {serverError && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="ARS ID" htmlFor="arsId" required error={errors.arsId?.message}>
          <TextInput id="arsId" placeholder="20-123" {...register('arsId')} invalid={!!errors.arsId} />
        </FormField>
        <FormField label="자치구" htmlFor="district" error={errors.district?.message}>
          <TextInput id="district" placeholder="강남구" {...register('district')} invalid={!!errors.district} />
        </FormField>
      </div>

      <FormField label="정류장 이름" htmlFor="name" required error={errors.name?.message}>
        <TextInput id="name" placeholder="역삼역 4번 출구" {...register('name')} invalid={!!errors.name} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="위도 (latitude)"
          htmlFor="latitude"
          required
          error={errors.latitude?.message}
          hint="-90 ~ 90"
        >
          <TextInput
            id="latitude"
            type="number"
            step="0.000001"
            placeholder="37.5009"
            {...register('latitude', { valueAsNumber: true })}
            invalid={!!errors.latitude}
          />
        </FormField>
        <FormField
          label="경도 (longitude)"
          htmlFor="longitude"
          required
          error={errors.longitude?.message}
          hint="-180 ~ 180"
        >
          <TextInput
            id="longitude"
            type="number"
            step="0.000001"
            placeholder="127.0364"
            {...register('longitude', { valueAsNumber: true })}
            invalid={!!errors.longitude}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Link
          href="/manager/stop"
          className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-black px-4 py-2 text-sm font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
        >
          {isSubmitting ? '등록 중…' : '정류장 등록'}
        </button>
      </div>
    </form>
  );
}

function BulkPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: true } | { ok: false; message: string } | null>(null);

  const onRun = async () => {
    if (!confirm('공공 API 로 전체 정류장을 동기화합니다. 계속하시겠습니까?')) return;
    setRunning(true);
    setResult(null);
    try {
      await StopService.registerBulk();
      setResult({ ok: true });
    } catch (e) {
      setResult({
        ok: false,
        message: extractApiError(e, '대량 등록에 실패했습니다.'),
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl rounded-lg border border-brand-gray-200 bg-white p-6">
      <h2 className="text-sm font-bold text-brand-black">공공 API 일괄 동기화</h2>
      <p className="mt-1 text-sm text-brand-gray-600">
        서울시 버스정보시스템 등 공공 API 로부터 전체 정류장을 가져와 일괄 등록·갱신합니다.
        기존 데이터는 ARS ID 기준으로 덮어쓰기 됩니다.
      </p>

      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="mt-5 rounded-md bg-brand-black px-4 py-2 text-sm font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
      >
        {running ? '동기화 중…' : '대량 등록 실행'}
      </button>

      {result && result.ok && (
        <div className="mt-4 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          정류장 일괄 등록이 완료되었습니다.
        </div>
      )}
      {result && !result.ok && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {result.message}
        </div>
      )}
    </div>
  );
}
