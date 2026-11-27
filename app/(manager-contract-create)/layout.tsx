import ManagerShell from '@/components/manager/ManagerShell';
import { CONTRACT_CREATE_NAV } from '@/constants/navigation';

export default function ContractCreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerShell requirePermission={CONTRACT_CREATE_NAV.requirePermission} requireMemberType={CONTRACT_CREATE_NAV.requireMemberType}>
      {children}
    </ManagerShell>
  );
}
