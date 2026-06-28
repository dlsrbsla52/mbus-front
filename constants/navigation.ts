export const NAV_ITEMS = [
  { name: "회사소개", href: "/intro" },
  { name: "비즈니스", href: "/business" },
  { name: "포트폴리오", href: "/portfolio" },
  { name: "고객지원", href: "/support" },
  { name: "홍보센터", href: "/news" },
];

export const SERVICE_ITEMS = [
  {
    id: 1,
    title: "디지털 마케팅",
    desc: "데이터 기반의 정교한 퍼포먼스 마케팅과 브랜드 전략을 수립합니다.",
    icon: "Monitor",
  },
  {
    id: 2,
    title: "컨텐츠 제작",
    desc: "사용자의 감각을 깨우는 고퀄리티 멀티미디어 컨텐츠를 기획하고 제작합니다.",
    icon: "Layout",
  },
  {
    id: 3,
    title: "시스템 통합(SI)",
    desc: "안정적이고 확장 가능한 기업용 시스템 및 애플리케이션을 구축합니다.",
    icon: "Cloud",
  },
  {
    id: 4,
    title: "클라우드 서비스",
    desc: "안전한 데이터 관리와 클라우드 마이그레이션을 위한 토탈 솔루션을 제공합니다.",
    icon: "ShieldCheck",
  },
];

import type { MemberType, Permission } from "@/lib/api/member";

export interface ManagerNavItem {
  label: string;
  href: string;
  icon: string;
  requirePermission?: Permission;
  requireMemberType?: MemberType[];
}

export interface ManagerNavGroup {
  title: string;
  items: ManagerNavItem[];
}

export const MANAGER_NAV: ManagerNavGroup[] = [
  {
    title: "운영",
    items: [
      { label: "대시보드", href: "/manager", icon: "LayoutDashboard" },
      { label: "통계 리포트", href: "/manager/stats", icon: "BarChart3" },
    ],
  },
  {
    title: "정류장",
    items: [
      { label: "정류장 관리", href: "/manager/stop", icon: "MapPin" },
      { label: "단가 관리", href: "/manager/stop-price", icon: "CircleDollarSign" },
    ],
  },
  {
    title: "거래",
    items: [
      { label: "예약 관리", href: "/manager/reservation", icon: "CalendarClock" },
      { label: "계약 관리", href: "/manager/contract", icon: "FileSignature" },
    ],
  },
  {
    title: "회원·알림",
    items: [
      { label: "회원 관리", href: "/manager/member", icon: "Users" },
      { label: "갱신 알림", href: "/manager/notification", icon: "BellRing" },
    ],
  },
  {
    title: "정산",
    items: [
      {
        label: "정산 관리",
        href: "/manager/commission",
        icon: "CirclePercent",
        requireMemberType: ["ADMIN_MASTER"],
      },
    ],
  },
  {
    title: "권한",
    items: [
      {
        label: "회원 역할 부여",
        href: "/manager/role",
        icon: "ShieldCheck",
        requireMemberType: ["ADMIN_MASTER"],
      },
      {
        label: "역할 권한 템플릿",
        href: "/manager/role-permission",
        icon: "KeyRound",
        requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
      },
    ],
  },
];
