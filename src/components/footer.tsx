import React from "react";
import { DiscordLogoIcon, TelegramLogoIcon, TiktokLogoIcon, YoutubeLogoIcon, WhatsappLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="w-full bg-base-300 shadow-xl p-5 flex flex-col items-center space-y-5">
      <Image src="/icon.png" alt="logo" width="100" height="100" />
      <div className="flex space-x-5 items-center">
        <a href="https://t.me/anios_tv" target="_blank">
          <TelegramLogoIcon width="25" height="25" />
        </a>
        <a href="https://discord.gg/" target="_blank">
          <DiscordLogoIcon width="25" height="25" />
        </a>
        <a href="https://tiktok.com/@aniostv" target="_blank">
          <TiktokLogoIcon width="25" target="_blank" />
        </a>
        <a href="https://Youtube.com/@aniostv" target="_blank">
          <YoutubeLogoIcon width="25" target="_blank" />
        </a>
        <a href="https://discord.gg/" target="_blank">
          <WhatsappLogoIcon width="25" target="_blank" />
        </a>
      </div>
      <p className="text-sm text-gray-300">
        AniOS no almacena ningún archivo en el servidor, solo enlaza a los contenidos multimedia alojados en servicios de terceros.      <p className="text-sm text-gray-300">&copy; todos los derechos reservados a su desarrollador - DioverDM</p>
    </footer>
  );
};

export default Footer;
