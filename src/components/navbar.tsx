"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

import Container from "./container";
import { Separator } from "./ui/separator";

import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";

import SearchBar from "./search-bar";
import { MenuIcon, X, Home, Compass, Newspaper, Bookmark } from "lucide-react";
import useScrollPosition from "@/hooks/use-scroll-position";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import LoginPopoverButton from "./login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import { pb } from "@/lib/pocketbase";
import NavbarAvatar from "./navbar-avatar";
import { toast } from "sonner";

// Menú de navegación en español
const menuItems: Array<{ title: string; href?: string; icon?: ReactNode }> = [
  // {
  //  title: "Inicio",
  //  href: ROUTES.HOME,
  //  icon: <Home size={18} />
  // },
  // {
  //  title: "Catálogo",
  //  href: ROUTES.CATALOG || "#",
  //  icon: <Compass size={18} />
  // },
  // {
  //  title: "Novedades",
  //  href: ROUTES.NEWS || "#",
  //  icon: <Newspaper size={18} />
  // },
  // {
  //  title: "Mi Lista",
  //  href: ROUTES.COLLECTION || "#",
  //  icon: <Bookmark size={18} />
  // },
];

const NavBar = () => {
  const auth = useAuthStore();
  const { y } = useScrollPosition();
  const isHeaderFixed = true;
  const isHeaderSticky = y > 0;

  useEffect(() => {
    const refreshAuth = async () => {
      const auth_token = JSON.parse(
        localStorage.getItem("pocketbase_auth") as string,
      );
      if (auth_token) {
        try {
          const user = await pb.collection("users").authRefresh();
          if (user) {
            auth.setAuth({
              id: user.record.id,
              email: user.record.email,
              username: user.record.username,
              avatar: user.record.avatar,
              collectionId: user.record.collectionId,
              collectionName: user.record.collectionName,
              autoSkip: user.record.autoSkip,
            });
          }
        } catch (e) {
          console.error("Error de autenticación:", e);
          localStorage.removeItem("pocketbase_auth");
          auth.clearAuth();
          toast.error("La sesión ha expirado.", {
            style: { background: "red" },
          });
        }
      }
    };
    refreshAuth();
  }, []);

  return (
    <div
      className={cn([
        "h-fit w-full",
        "sticky top-0 z-[100] duration-300 transition-all",
        isHeaderFixed ? "fixed bg-gradient-to-b from-slate-800 to-slate-900/90" : "",
        isHeaderSticky
          ? "bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg"
          : "",
      ])}
    >
      <Container className="flex items-center justify-between py-3 gap-20">
        {/* Logo y Nombre */}
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Image 
            src="/icon.png" 
            alt="Logo AniOS" 
            width={60} 
            height={60}
            className="transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AniOS
            </h1>
            <p className="text-xs text-gray-400 -mt-1">Tu anime sin límites</p>
          </div>
        </Link>

        {/* Menú Desktop */}
        <div className="hidden lg:flex items-center gap-8 ml-10">
          {menuItems.map((menu, idx) => (
            <Link 
              href={menu.href || "#"} 
              key={idx}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 font-medium text-sm group"
            >
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                {menu.icon}
              </span>
              {menu.title}
            </Link>
          ))}
        </div>

        {/* Barra de búsqueda y usuario (Desktop) */}
        <div className="w-1/3 hidden lg:flex items-center gap-4">
          <SearchBar />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>

        {/* Menú Mobile */}
        <div className="lg:hidden flex items-center gap-4">
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
          <MobileMenuSheet trigger={<MenuIcon size={24} />} />
        </div>
      </Container>
    </div>
  );
};

const MobileMenuSheet = ({ trigger }: { trigger: ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="text-gray-400 hover:text-white transition-colors">
        {trigger}
      </SheetTrigger>
      <SheetContent
        className="flex flex-col w-[85vw] max-w-sm z-[150] bg-slate-900 border-l border-slate-700"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="w-full h-full relative">
          {/* Header del Sheet */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Image 
                src="/icon.png" 
                alt="Logo AniOS" 
                width={40} 
                height={40}
              />
              <div>
                <h2 className="font-bold text-white">AniOS</h2>
                <p className="text-xs text-gray-400">Menú</p>
              </div>
            </div>
            <SheetClose className="text-gray-400 hover:text-white transition-colors p-2">
              <X size={20} />
            </SheetClose>
          </div>

          {/* Contenido del menú */}
          <div className="flex flex-col gap-1">
            {menuItems.map((menu, idx) => (
              <Link
                href={menu.href || "#"}
                key={idx}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
              >
                <span className="text-gray-400">
                  {menu.icon}
                </span>
                {menu.title}
              </Link>
            ))}
            
            <Separator className="my-4 bg-slate-700" />
            
            {/* Barra de búsqueda en móvil */}
            <div className="px-4">
              <SearchBar onAnimeClick={() => setOpen(false)} />
            </div>
          </div>

          {/* Footer del Sheet */}
          <div className="absolute bottom-6 left-4 right-4">
            <p className="text-xs text-gray-500 text-center">
              Disfruta del anime responsablemente
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;