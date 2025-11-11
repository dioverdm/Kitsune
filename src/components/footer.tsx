"use client";

import React from "react";
import { DiscordLogoIcon, TelegramLogoIcon, TiktokLogoIcon, YoutubeLogoIcon, WhatsappLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-br from-gray-900 via-purple-900 to-slate-900 border-t border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Logo y Redes Sociales */}
        <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-lg"></div>
              <Image 
                src="/icon.png" 
                alt="AniOS Logo" 
                width="80" 
                height="80"
                className="relative z-10 transform hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AniOS
              </h3>
              <p className="text-sm text-gray-400">Tu plataforma de anime</p>
            </div>
          </div>

          {/* Redes Sociales */}
          <div className="flex space-x-4">
            {[
              { href: "https://t.me/anios_tv", icon: TelegramLogoIcon, color: "hover:text-blue-400" },
              { href: "https://discord.gg/", icon: DiscordLogoIcon, color: "hover:text-indigo-400" },
              { href: "https://tiktok.com/@aniostv", icon: TiktokLogoIcon, color: "hover:text-pink-400" },
              { href: "https://youtube.com/@aniostv", icon: YoutubeLogoIcon, color: "hover:text-red-400" },
              { href: "https://discord.gg/", icon: WhatsappLogoIcon, color: "hover:text-green-400" },
            ].map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 ${social.color} hover:bg-white/10 hover:border-white/20 hover:scale-110`}
              >
                <social.icon width="22" height="22" />
              </a>
            ))}
          </div>
        </div>

        {/* Separador */}
        <div className="my-8 border-t border-white/10"></div>

        {/* Texto informativo */}
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-400 leading-relaxed max-w-2xl mx-auto">
            AniOS no almacena ningún archivo en el servidor, solo enlaza a los contenidos multimedia 
            alojados en servicios de terceros. Disfruta del anime de manera legal y responsable.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
            <span>&copy; {new Date().getFullYear()} AniOS - Todos los derechos reservados</span>
            <span className="hidden sm:block">•</span>
            <span>Desarrollado con ❤️ por DioverDM </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;