import type { MemberType, Permission } from "@/lib/api/member";

export interface SiteMenuChild {
  label: string;
  href: string;
}

export interface SiteMenuItem {
  label: string;
  href: string;
  /** 서브 비주얼 아래 하위 메뉴 탭. 하나뿐이면 탭도 하나만 보인다. */
  children: SiteMenuChild[];
}

/** 공개 사이트 메뉴. 기존 mbus.co.kr 메뉴 구성과 같다. */
export const SITE_MENU: SiteMenuItem[] = [
  {
    label: "회사소개",
    href: "/company",
    children: [
      { label: "인사말", href: "/company" },
      { label: "오시는 길", href: "/company/location" },
    ],
  },
  {
    label: "매체소개",
    href: "/media",
    children: [
      { label: "매체소개", href: "/media" },
      { label: "매체안내", href: "/media/guide" },
    ],
  },
  {
    label: "포트폴리오",
    href: "/portfolio",
    children: [{ label: "포트폴리오", href: "/portfolio" }],
  },
  {
    label: "온라인 문의",
    href: "/inquiry",
    children: [{ label: "온라인 문의", href: "/inquiry" }],
  },
  {
    label: "고객센터",
    href: "/support/notice",
    children: [
      { label: "공지사항", href: "/support/notice" },
      { label: "FAQ", href: "/support/faq" },
    ],
  },
];

export interface ManagerNavItem {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  requirePermission?: Permission;
  requireMemberType?: MemberType[];
}

export interface ManagerNavGroup {
  title: string;
  items: ManagerNavItem[];
}

export const CONTRACT_MANAGE_NAV = {
  label: "계약 관리",
  href: "/manager/contract",
  icon: "FileSignature",
  exact: true,
  requirePermission: "MANAGE",
  requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
} satisfies ManagerNavItem;

export const CONTRACT_CREATE_NAV = {
  label: "계약 등록",
  href: "/manager/contract/new",
  icon: "FileSignature",
  requirePermission: "WRITE",
  requireMemberType: ["ADMIN_USER", "ADMIN_MASTER", "ADMIN_DEVELOPER"],
} satisfies ManagerNavItem;

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
      {
        label: "정류장 관리",
        href: "/manager/stop",
        icon: "MapPin",
        requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
      },
      {
        label: "단가 관리",
        href: "/manager/stop-price",
        icon: "CircleDollarSign",
        requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
      },
    ],
  },
  {
    title: "거래",
    items: [
      { label: "예약 관리", href: "/manager/reservation", icon: "CalendarClock" },
      CONTRACT_MANAGE_NAV,
      CONTRACT_CREATE_NAV,
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
    title: "콘텐츠",
    items: [
      {
        label: "포트폴리오",
        href: "/manager/portfolio",
        icon: "Images",
        requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
      },
      {
        label: "공지사항",
        href: "/manager/notice",
        icon: "Megaphone",
        requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
      },
      {
        label: "FAQ",
        href: "/manager/faq",
        icon: "CircleHelp",
        requireMemberType: ["ADMIN_MASTER", "ADMIN_DEVELOPER"],
      },
      { label: "온라인 문의", href: "/manager/inquiry", icon: "MessageSquareText" },
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
