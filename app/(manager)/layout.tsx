import ManagerShell from '@/components/manager/ManagerShell';

export default function ManagerGroupLayout({ children }: { children: React.ReactNode }) {
  return <ManagerShell>{children}</ManagerShell>;
}
