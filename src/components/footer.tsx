"use client";

import React from "react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-br from-gray-900 via-purple-900 to-slate-900 border-t border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Image 
              src="/icon.png" 
              alt="AniOS Logo" 
              width="80" 
              height="80"
              className="transform hover:scale-105 transition-transform duration-300"
            />
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AniOS
              </h3>
              <p className="text-sm text-gray-400">Tu plataforma de anime</p>
            </div>
          </div>

          {/* Redes Sociales - Solo Discord por ahora */}
          <div className="flex space-x-4">
            <a
              href="https://discord.gg/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-110 hover:text-indigo-400"
              title="Discord"
            >
              <DiscordLogoIcon width="22" height="22" />
            </a>
            {/* Puedes agregar más íconos cuando los tengas disponibles */}
          </div>
        </div>

        <div className="my-8 border-t border-white/10"></div>

        <div className="text-center space-y-3">
          <p className="text-sm text-gray-400 leading-relaxed max-w-2xl mx-auto">
            AniOS no almacena ningún archivo en el servidor, solo enlaza a los contenidos multimedia 
            alojados en servicios de terceros. Disfruta del anime de manera legal y responsable.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
            <span>&copy; {new Date().getFullYear()} AniOS - Todos los derechos reservados</span>
            <span className="hidden sm:block">•</span>
            <span>Desarrollado con ❤️ por DioverDM</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;