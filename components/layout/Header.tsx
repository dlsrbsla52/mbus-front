"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, Home, LogIn, UserPlus, User, LogOut, ShieldCheck } from "lucide-react";
import { useScrollPos } from "@/hooks/useScrollPos";
import { NAV_ITEMS } from "@/constants/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthService } from "@/lib/api/auth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isScrolled = useScrollPos(50);
  const pathname = usePathname();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);

  const isLoggedIn = isBootstrapped && isAuthenticated && !!user;
  const canManage = isLoggedIn && hasPermission("MANAGE");
  const displayName = user?.loginId ?? user?.email ?? "";

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      await AuthService.logout();
    } catch {
      /* 서버 로그아웃 실패해도 로컬 상태는 정리 */
    } finally {
      logout();
      router.push("/");
    }
  };
  
  // 홈 페이지 여부 확인
  const isHomePage = pathname === "/";
  
  // 헤더 배경색 결정: 홈이 아니면 항상 배경색 있음, 홈이면 스크롤 시에만 있음
  const hasBg = !isHomePage || isScrolled;
  
  // 텍스트 색상 결정: 배경이 있을 때와 없을 때 구분
  const textColorClass = hasBg ? "text-white" : "text-white"; 
  // 원본 사이트 컨셉 유지: 투명일 때도 화이트(히어로 배너가 어두우므로), 배경 있을 때도 화이트(배경이 블랙이므로)
  // 단, 홈이 아닌 일반 페이지(흰색 배경)에서는hasBg가 항상 true가 되도록 설계하여 검은 배경에 흰 글씨 유지.

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        hasBg ? "bg-brand-black/90 backdrop-blur-md shadow-lg py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <span className="text-2xl font-black tracking-tighter text-white">
            MEDIA<span className="text-brand-blue group-hover:text-blue-400 transition-colors">BUS</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-10">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-white hover:text-brand-blue font-bold text-[16px] tracking-tight transition-all hover:-translate-y-0.5"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Utility */}
        <div className="hidden lg:flex items-center space-x-6 text-white/80 text-sm font-bold">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1">
            <Home size={14} /> Home
          </Link>
          <div className="w-px h-3 bg-white/20" />
          {isLoggedIn ? (
            <>
              {canManage && (
                <Link href="/manager" className="hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1">
                  <ShieldCheck size={14} /> 관리자
                </Link>
              )}
              <Link href="/mypage" className="hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1">
                <User size={14} /> {displayName || "마이페이지"}
              </Link>
              <button
                onClick={handleLogout}
                className="hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 border border-white/20 rounded-full hover:bg-white/10 transition-all"
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1">
                <LogIn size={14} /> Login
              </Link>
              <Link href="/join" className="hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 border border-white/20 rounded-full hover:bg-white/10 transition-all">
                <UserPlus size={14} /> Join
              </Link>
            </>
          )}
          <button className="p-2 hover:bg-white/10 rounded-full transition-all">
            <Search size={20} />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-full transition-all"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-brand-black z-40 transform transition-transform duration-500 lg:hidden ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-28 px-10 space-y-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-4xl font-black text-white hover:text-brand-blue transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-12 border-t border-white/10 flex flex-col space-y-6">
             {isLoggedIn ? (
               <div className="flex flex-col gap-6">
                  {canManage && (
                    <Link href="/manager" className="text-xl font-bold text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>관리자</Link>
                  )}
                  <Link href="/mypage" className="text-xl font-bold text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>{displayName || "마이페이지"}</Link>
                  <button onClick={handleLogout} className="text-left text-xl font-bold text-gray-400 hover:text-white">Logout</button>
               </div>
             ) : (
               <div className="flex items-center gap-6">
                  <Link href="/login" className="text-xl font-bold text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>Login</Link>
                  <Link href="/join" className="text-xl font-bold text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>Join</Link>
               </div>
             )}
             <p className="text-sm text-gray-600 font-medium">© 2024 MEDIABUS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

