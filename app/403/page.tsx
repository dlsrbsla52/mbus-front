export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-3xl font-black text-brand-black tracking-tight">403</h1>
      <p className="mt-3 text-sm text-gray-600">
        이 페이지에 접근할 권한이 없습니다.
      </p>
    </div>
  );
}
