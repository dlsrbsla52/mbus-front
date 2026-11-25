"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useScrollPos } from "@/hooks/useScrollPos";
import { SITE_MENU } from "@/constants/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthService } from "@/lib/api/auth";

interface HeaderProps {
  /** 비주얼 위에 투명하게 겹치는 페이지(홈·공개 서브 페이지). 스크롤하면 배경이 생긴다. */
  overlay: boolean;
}

/** 공개 사이트 헤더. 기존 mbus.co.kr 헤더(로고 · 가운데 메뉴 · 우측 Home/Login/Join)를 재현한다. */
const Header = ({ overlay }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isScrolled = useScrollPos(40);
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);

  const isLoggedIn = isBootstrapped && isAuthenticated && !!user;
  const canManage = isLoggedIn && hasPermission("MANAGE");

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      await AuthService.logoutCurrent();
    } catch {
      /* 서버 로그아웃 실패해도 로컬 상태는 정리 */
    } finally {
      logout();
      router.push("/");
    }
  };

  const solid = !overlay || isScrolled || isMenuOpen;
  const closeMenu = () => setIsMenuOpen(false);

  const utilLinkClass = "px-2 text-[12px] leading-none text-white/80 transition-colors hover:text-white";

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full transition-colors duration-300 ${
        solid ? "bg-[#111111]/95 shadow-md backdrop-blur" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[70px] max-w-[1430px] items-center justify-between px-[15px] lg:h-[90px]">
        <Link href="/" className="shrink-0" aria-label="미디어버스 홈">
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상이라 next/image 최적화를 쓰지 않는다 */}
          <img src="/images/site/logo.webp" alt="미디어버스" className="h-[38px] w-auto lg:h-[44px]" />
        </Link>

        <nav className="hidden h-full items-center lg:flex" aria-label="주 메뉴">
          {SITE_MENU.map((item) => (
            <div key={item.href} className="group relative flex h-full items-center">
              <Link
                href={item.href}
                className="px-[38px] text-[16px] font-medium text-white transition-colors group-hover:text-[#6fc8ff] group-focus-within:text-[#6fc8ff]"
              >
                {item.label}
              </Link>
              {item.children.length > 1 && (
                <div className="invisible absolute left-1/2 top-full min-w-[150px] -translate-x-1/2 bg-white py-2 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block whitespace-nowrap px-5 py-2.5 text-center text-[14px] text-[#333] hover:bg-[#f2f2f2] hover:text-site-navy"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden items-center divide-x divide-white/30 lg:flex">
          <Link href="/" className={utilLinkClass}>
            Home
          </Link>
          {isLoggedIn ? (
            <>
              {canManage && (
                <Link href="/manager" className={utilLinkClass}>
                  관리자
                </Link>
              )}
              <Link href="/mypage" className={utilLinkClass}>
                마이페이지
              </Link>
              <button type="button" onClick={handleLogout} className={utilLinkClass}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={utilLinkClass}>
                Login
              </Link>
              <Link href="/join" className={utilLinkClass}>
                Join
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="p-2 text-white lg:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="max-h-[calc(100vh-70px)] overflow-y-auto border-t border-white/10 bg-[#111111] px-[15px] pb-8 lg:hidden">
          <nav aria-label="모바일 메뉴">
            {SITE_MENU.map((item) => (
              <div key={item.href} className="border-b border-white/10 py-4">
                <Link href={item.href} onClick={closeMenu} className="block text-[17px] font-bold text-white">
                  {item.label}
                </Link>
                {item.children.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={closeMenu}
                        className="text-[14px] text-white/60 hover:text-white"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="mt-6 flex flex-wrap gap-5 text-[14px] text-white/70">
            {isLoggedIn ? (
              <>
                {canManage && (
                  <Link href="/manager" onClick={closeMenu}>
                    관리자
                  </Link>
                )}
                <Link href="/mypage" onClick={closeMenu}>
                  마이페이지
                </Link>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMenu}>
                  Login
                </Link>
                <Link href="/join" onClick={closeMenu}>
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
