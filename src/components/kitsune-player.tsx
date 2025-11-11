"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  HTMLAttributes,
} from "react";
import Artplayer from "artplayer";
import type { Option } from "artplayer/types/option";
import Hls from "hls.js";

// Helper functions and types (keep or import from your types file)
import { IEpisodeServers, IEpisodeSource, IEpisodes } from "@/types/episodes";
import loadingImage from "@/assets/genkai.gif";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import artplayerPluginAmbilight from "artplayer-plugin-ambilight";
import { env } from "next-runtime-env";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { pb } from "@/lib/pocketbase";
import Image from "next/image";

const WATCH_PROGRESS_UPDATE_INTERVAL = 10000; // Actualizar cada 10 segundos
const WATCH_PROGRESS_MIN_WATCH_TIME = 10; // Mínimo segundos vistos para crear registro

interface ArtPlayerProps extends HTMLAttributes<HTMLDivElement> {
  episodeInfo: IEpisodeSource;
  animeInfo: { title: string; image: string; id: string };
  subOrDub: "sub" | "dub";
  episodes?: IEpisodes;
  getInstance?: (art: Artplayer) => void;
  autoSkip?: boolean;
  serversData: IEpisodeServers;
}

interface HighlightPoint {
  time: number;
  text: string;
}

const generateHighlights = (
  start: number | undefined | null,
  end: number | undefined | null,
  label: string,
): HighlightPoint[] => {
  if (start == null || end == null || start >= end) return [];
  const highlights: HighlightPoint[] = [];
  for (let time = Math.floor(start); time <= Math.floor(end); time++) {
    highlights.push({ time, text: label });
  }
  return highlights;
};

function KitsunePlayer({
  episodeInfo,
  animeInfo,
  subOrDub,
  getInstance,
  autoSkip = true,
  serversData,
  ...rest
}: ArtPlayerProps): JSX.Element {
  const artContainerRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  const [isAutoSkipEnabled, setIsAutoSkipEnabled] = useState(autoSkip);

  const bookmarkIdRef = useRef<string | null>(null);
  const watchHistoryIdsRef = useRef<string[]>([]);
  const watchedRecordIdRef = useRef<string | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const hasMetMinWatchTimeRef = useRef<boolean>(false);
  const initialSeekTimeRef = useRef<number | null>(null);

  const { auth } = useAuthStore();
  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({
    populate: false,
  });

  useEffect(() => {
    setIsAutoSkipEnabled(autoSkip);
  }, [autoSkip]);

  // --- Construir URI del Proxy ---
  const uri = useMemo(() => {
    const firstSourceUrl = episodeInfo?.sources?.[0]?.url;
    const referer = episodeInfo?.headers?.Referer;
    if (!firstSourceUrl || !referer) return null;

    try {
      const baseURI = `${env("NEXT_PUBLIC_PROXY_URL")}/m3u8-proxy`;
      const url = encodeURIComponent(firstSourceUrl);
      return `${baseURI}?url=${url}&referer=${referer}`;
    } catch (error) {
      console.error("Error construyendo URI del proxy:", error);
      return null;
    }
  }, [episodeInfo]);

  const skipTimesRef = useRef<{
    introStart?: number;
    introEnd?: number;
    validIntro: boolean;
    outroStart?: number;
    outroEnd?: number;
    validOutro: boolean;
  }>({ validIntro: false, validOutro: false });

  useEffect(() => {
    if (!auth || !animeInfo.id || !serversData.episodeId) {
      bookmarkIdRef.current = null;
      watchedRecordIdRef.current = null;
      watchHistoryIdsRef.current = [];
      hasMetMinWatchTimeRef.current = false;
      initialSeekTimeRef.current = null;
      return;
    }

    let isMounted = true;

    const fetchBookmarkAndWatchedId = async () => {
      const id = await createOrUpdateBookMark(
        animeInfo.id,
        animeInfo.title,
        animeInfo.image,
        "watching",
        false,
      );

      if (!isMounted || !id) {
        bookmarkIdRef.current = null;
        watchedRecordIdRef.current = null;
        watchHistoryIdsRef.current = [];
        initialSeekTimeRef.current = null;
        hasMetMinWatchTimeRef.current = false;
        return;
      }

      bookmarkIdRef.current = id;
      hasMetMinWatchTimeRef.current = false;

      try {
        const expandedBookmark = await pb.collection("bookmarks").getOne(id, {
          expand: "watchHistory",
        });

        if (!isMounted) return;

        const history = expandedBookmark.expand?.watchHistory as
          | any[]
          | undefined;
        const existingWatched = history?.find(
          (watched: any) => watched.episodeId === serversData.episodeId,
        );

        if (existingWatched) {
          watchedRecordIdRef.current = existingWatched.id;
          initialSeekTimeRef.current =
            typeof existingWatched.current === "number"
              ? existingWatched.current
              : null;
          hasMetMinWatchTimeRef.current =
            initialSeekTimeRef.current !== null &&
            initialSeekTimeRef.current >= WATCH_PROGRESS_MIN_WATCH_TIME;
        } else {
          watchedRecordIdRef.current = null;
          initialSeekTimeRef.current = null;
          hasMetMinWatchTimeRef.current = false;
        }
      } catch (e) {
        console.error("Error obteniendo historial de visualización:", e);
        if (!isMounted) return;
        watchedRecordIdRef.current = null;
        initialSeekTimeRef.current = null;
        hasMetMinWatchTimeRef.current = false;
      }
    };

    fetchBookmarkAndWatchedId();

    return () => {
      isMounted = false;
    };
  }, [
    auth,
    animeInfo.id,
    animeInfo.title,
    animeInfo.image,
    serversData.episodeId,
    createOrUpdateBookMark,
  ]);

  // --- Efecto para Inicialización y Limpieza del Reproductor ---
  useEffect(() => {
    if (!artContainerRef.current || !uri) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      if (artInstanceRef.current) {
        artInstanceRef.current.destroy(true);
        artInstanceRef.current = null;
      }
      return;
    }

    const introStart = episodeInfo?.intro?.start;
    const introEnd = episodeInfo?.intro?.end;
    skipTimesRef.current.validIntro =
      typeof introStart === "number" &&
      typeof introEnd === "number" &&
      introStart < introEnd;
    skipTimesRef.current.introStart = introStart;
    skipTimesRef.current.introEnd = introEnd;

    const outroStart = episodeInfo?.outro?.start;
    const outroEnd = episodeInfo?.outro?.end;
    skipTimesRef.current.validOutro =
      typeof outroStart === "number" &&
      typeof outroEnd === "number" &&
      outroStart < outroEnd;
    skipTimesRef.current.outroStart = outroStart;
    skipTimesRef.current.outroEnd = outroEnd;

    // Función helper para etiquetas de subtítulos
    const getSubtitleLabel = (lang: string) => {
      const labels: { [key: string]: string } = {
        "English": "Inglés",
        "Spanish": "Español", 
        "Español": "Español",
        "French": "Francés",
        "German": "Alemán",
        "Japanese": "Japonés",
        "Portuguese": "Portugués"
      };
      return labels[lang] || lang;
    };

    // Opciones de subtítulos en español
    const trackOptions: any = (episodeInfo?.tracks ?? []).map((track) => ({
      default: track.lang === "Español",
      html: getSubtitleLabel(track.lang),
      url: track.url,
    }));

    const subtitleConfig: Option["subtitle"] =
      subOrDub === "sub"
        ? {
          url: episodeInfo?.tracks?.find((track) => 
            track.lang === "Español" || track.lang === "Spanish"
          )?.url,
          type: "vtt",
          style: {
            color: "#FFFFFF",
            fontSize: "22px",
            textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          },
          encoding: "utf-8",
          escape: false,
        }
        : {};

    // Control de salto manual - Traducido
    const manualSkipControl = {
      name: "manual-skip",
      position: "right",
      html: `
                <div style="display: flex; align-items: center; gap: 4px; padding: 0 6px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
                    <span class="art-skip-text">Saltar</span>
                </div>
            `,
      tooltip: "Saltar",
      style: {
        display: "none",
        cursor: "pointer",
        borderRadius: "4px",
        marginRight: "10px",
        padding: "3px 0",
        background: "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.3)",
      },
      click: function(controlItem: any) {
        const art = artInstanceRef.current;
        if (!art) return;
        const { introEnd, outroStart, outroEnd, validIntro, validOutro } =
          skipTimesRef.current;
        const currentTime = art.currentTime;
        const duration = art.duration;

        let seekTarget: number | null = null;
        const resolvedOutroEnd =
          validOutro && outroEnd === 0 && duration > 0 ? duration : outroEnd;

        if (
          validIntro &&
          typeof introEnd === "number" &&
          currentTime >= skipTimesRef.current.introStart! &&
          currentTime < introEnd
        ) {
          seekTarget = introEnd;
        } else if (
          validOutro &&
          typeof outroStart === "number" &&
          typeof resolvedOutroEnd === "number" &&
          currentTime >= outroStart &&
          currentTime < resolvedOutroEnd
        ) {
          seekTarget =
            resolvedOutroEnd === duration ? duration - 0.1 : resolvedOutroEnd;
        }

        if (typeof seekTarget === "number") {
          art.seek = Math.min(seekTarget, duration);
        }

        if (controlItem.style) controlItem.style.display = "none";
      },
    };

    let currentHlsInstanceForCleanup: Hls | null = null;

    // Opciones Finales del Reproductor - Mejoradas
    const finalOptions: Option = {
      container: artContainerRef.current,
      url: uri,
      type: "m3u8",
      customType: {
        m3u8: (
          videoElement: HTMLMediaElement,
          url: string,
          artPlayerInstance: Artplayer,
        ) => {
          if (Hls.isSupported()) {
            if (hlsInstanceRef.current) {
              hlsInstanceRef.current.destroy();
            }
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90
            });
            hls.loadSource(url);
            hls.attachMedia(videoElement);
            hlsInstanceRef.current = hls;
            currentHlsInstanceForCleanup = hls;
            
            artPlayerInstance.on("destroy", () => {
              if (hlsInstanceRef.current === hls) {
                hls.destroy();
                hlsInstanceRef.current = null;
                currentHlsInstanceForCleanup = null;
              }
            });
          } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
            videoElement.src = url;
          } else {
            artPlayerInstance.notice.show = "La reproducción HLS no es compatible con tu navegador.";
          }
        },
      },
      plugins: [
        artplayerPluginHlsControl({
          quality: {
            control: true,
            setting: true,
            getName: (level: { height?: number; bitrate?: number }) =>
              level.height ? `${level.height}P` : "Automático",
            title: "Calidad",
            auto: "Automático",
          },
          audio: {
            control: true,
            setting: true,
            getName: (track: { name?: string }) => track.name ?? "Desconocido",
            title: "Audio",
            auto: "Automático",
          },
        }),
        artplayerPluginAmbilight({
          // CORREGIDO: blur debe ser string, no número
          blur: "30px",
          opacity: 0.8,
          frequency: 10,
          duration: 0.3,
          zIndex: -1,
        }),
      ],
      settings: [
        {
          width: 250,
          html: "Subtítulos",
          tooltip: "Subtítulos",
          selector: [
            {
              html: "Mostrar",
              tooltip: subOrDub === "sub" ? "Ocultar" : "Mostrar",
              switch: subOrDub === "sub",
              onSwitch: function(item) {
                const showSubtitle = !item.switch;
                art.subtitle.show = showSubtitle;
                item.tooltip = showSubtitle ? "Ocultar" : "Mostrar";
                return showSubtitle;
              },
            },
            ...trackOptions,
          ],
          onSelect: function(item: any) {
            if (item.url && typeof item.url === "string") {
              art.subtitle.switch(item.url, { name: item.html });
              return item.html;
            }
            return item.html;
          },
        },
        {
          width: 200,
          html: "Salto Automático",
          tooltip: "Salto Automático",
          selector: [
            {
              html: "Activar",
              tooltip: isAutoSkipEnabled ? "Desactivar" : "Activar",
              switch: isAutoSkipEnabled,
              onSwitch: function(item) {
                const newState = !item.switch;
                setIsAutoSkipEnabled(newState);
                item.tooltip = newState ? "Desactivar" : "Activar";
                return newState;
              },
            },
          ],
        },
      ],
      controls: [manualSkipControl],
      highlight: [
        ...generateHighlights(
          episodeInfo?.intro?.start,
          episodeInfo?.intro?.end,
          "Intro",
        ),
        ...generateHighlights(
          episodeInfo?.outro?.start,
          episodeInfo?.outro?.end,
          "Outro",
        ),
      ],
      poster: animeInfo.image,
      volume: 0.8,
      isLive: false,
      muted: false,
      autoplay: false,
      autoOrientation: true,
      pip: true,
      autoSize: true, // Cambiado a true para mejor adaptación
      autoMini: false,
      screenshot: true,
      setting: true,
      loop: false,
      flip: false,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true, // Cambiado a true para mejor UX
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: "#F5316F",
      moreVideoAttr: { 
        crossOrigin: "anonymous",
        playsInline: true
      },
      subtitle: subtitleConfig,
      icons: {
        loading: `<img width="60" height="60" src="${loadingImage.src}">`,
        state: `<svg width="30" height="30" viewBox="0 0 30 30"><path fill="currentColor" d="M15 3C8.373 3 3 8.373 3 15s5.373 12 12 12 12-5.373 12-12S21.627 3 15 3zm-2 18v-12l8 6-8 6z"/></svg>`,
      },
      lang: 'es', // Idioma español
    };

    // --- Inicializar ArtPlayer ---
    const art = new Artplayer(finalOptions);
    artInstanceRef.current = art;

    // --- Manejador de Lógica de Salto ---
    const handleTimeUpdate = () => {
      const art = artInstanceRef.current;
      if (!art || art.loading.show) return;

      const currentTime = art.currentTime;
      const duration = art.duration;
      const { introStart, introEnd, validIntro, outroStart, outroEnd, validOutro } = skipTimesRef.current;

      const resolvedOutroEnd = validOutro && outroEnd === 0 && duration > 0 ? duration : outroEnd;
      const inIntro = validIntro && typeof introStart === "number" && typeof introEnd === "number" && currentTime >= introStart && currentTime < introEnd;
      const inOutro = validOutro && typeof outroStart === "number" && typeof resolvedOutroEnd === "number" && currentTime >= outroStart && currentTime < resolvedOutroEnd;

      const manualSkip = art.controls["manual-skip"];

      if (isAutoSkipEnabled) {
        if (manualSkip?.style?.display !== "none") {
          if (manualSkip.style) manualSkip.style.display = "none";
        }
        if (inIntro && typeof introEnd === "number") {
          art.seek = introEnd;
          art.notice.show = "Intro saltada automáticamente";
        } else if (inOutro && typeof resolvedOutroEnd === "number") {
          const seekTarget = resolvedOutroEnd === duration ? duration - 0.1 : resolvedOutroEnd;
          art.seek = Math.min(seekTarget, duration);
          art.notice.show = "Outro saltado automáticamente";
        }
      } else {
        if (!manualSkip) return;

        if (inIntro || inOutro) {
          if (manualSkip.style?.display === "none") {
            if (manualSkip.style) manualSkip.style.display = "inline-flex";
          }
          const skipText = inIntro ? "Intro" : "Outro";
          const textElement = manualSkip.querySelector(".art-skip-text");
          if (textElement) {
            textElement.textContent = `Saltar ${skipText}`;
          }
          manualSkip.tooltip = `Saltar ${skipText}`;
        } else {
          if (manualSkip.style?.display !== "none") {
            if (manualSkip.style) manualSkip.style.display = "none";
          }
        }
      }

      // --- Seguimiento del Progreso ---
      if (!hasMetMinWatchTimeRef.current && currentTime >= WATCH_PROGRESS_MIN_WATCH_TIME) {
        hasMetMinWatchTimeRef.current = true;
        if (!watchedRecordIdRef.current) {
          syncWatchProgress(
            bookmarkIdRef.current,
            null,
            {
              episodeId: serversData.episodeId,
              episodeNumber: parseInt(serversData.episodeNo),
              current: currentTime,
              duration: duration,
            },
          ).then((newId) => {
            if (newId) {
              watchedRecordIdRef.current = newId;
              watchHistoryIdsRef.current.push(newId);
            }
          });
          lastUpdateTimeRef.current = Date.now();
        }
      }

      if ((hasMetMinWatchTimeRef.current || watchedRecordIdRef.current) && Date.now() - lastUpdateTimeRef.current > WATCH_PROGRESS_UPDATE_INTERVAL) {
        syncWatchProgress(bookmarkIdRef.current, watchedRecordIdRef.current, {
          episodeId: serversData.episodeId,
          episodeNumber: parseInt(serversData.episodeNo),
          current: currentTime,
          duration: duration,
        }).then((id) => {
          if (id) watchedRecordIdRef.current = id;
        });
        lastUpdateTimeRef.current = Date.now();
      }
    };

    // --- Event Listeners ---
    art.on("ready", () => {
      console.log("Reproductor listo. Duración:", art.duration);
      
      // Ajustar tamaño de subtítulos
      art.subtitle.style({
        fontSize: art.height * 0.04 + "px",
      });

      // Buscar última posición
      const seekTime = initialSeekTimeRef.current;
      if (seekTime !== null && seekTime > 0 && art.duration > 0 && seekTime < art.duration - 5) {
        console.log(`Buscando posición inicial: ${seekTime}`);
        setTimeout(() => {
          if (artInstanceRef.current) {
            artInstanceRef.current.seek = seekTime;
            artInstanceRef.current.notice.show = `Continuando desde ${Math.floor(seekTime / 60)}:${Math.floor(seekTime % 60).toString().padStart(2, '0')}`;
          }
        }, 500); // Aumentado a 500ms para mayor estabilidad
        initialSeekTimeRef.current = null;
      } else {
        console.log("Reproductor listo, sin búsqueda inicial.");
        initialSeekTimeRef.current = null;
      }
    });

    art.on("resize", () => {
      if (!artInstanceRef.current) return;
      const newSize = Math.max(14, Math.min(32, artInstanceRef.current.height * 0.04));
      artInstanceRef.current.subtitle.style({ fontSize: `${newSize}px` });
    });

    art.on("error", (error, reconnectTime) => {
      console.error("Error del Reproductor:", error, "Intento de reconexión:", reconnectTime);
      if (artInstanceRef.current) {
        artInstanceRef.current.notice.show = `Error: ${error.message || "Error de reproducción"}`;
      }
    });

    art.on("video:timeupdate", handleTimeUpdate);

    const handleInteractionUpdate = () => {
      const art = artInstanceRef.current;
      if (!art || !art.duration || art.duration <= 0) return;
      if (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current) {
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        syncWatchProgress(bookmarkIdRef.current, watchedRecordIdRef.current, {
          episodeId: serversData.episodeId,
          episodeNumber: parseInt(serversData.episodeNo),
          current: art.currentTime,
          duration: art.duration,
        }).then((id) => {
          if (id) watchedRecordIdRef.current = id;
        });
        lastUpdateTimeRef.current = Date.now();
      }
    };
    
    art.on("video:pause", handleInteractionUpdate);
    art.on("video:seeked", handleInteractionUpdate);

    // --- Callback para el Componente Padre ---
    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    // --- Función de Limpieza ---
    return () => {
      console.log("Ejecutando limpieza del reproductor");

      const art = artInstanceRef.current;
      const hls = hlsInstanceRef.current;

      if (hls) {
        hls.destroy();
        hlsInstanceRef.current = null;
      }

      if (art && art.duration > 0 && (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current)) {
        syncWatchProgress(bookmarkIdRef.current, watchedRecordIdRef.current, {
          episodeId: serversData.episodeId,
          episodeNumber: parseInt(serversData.episodeNo),
          current: art.currentTime,
          duration: art.duration,
        });
      }

      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }

      if (art) {
        art.off("video:pause", handleInteractionUpdate);
        art.off("video:seeked", handleInteractionUpdate);
        art.off("video:timeupdate", handleTimeUpdate);

        art.pause();

        if (art.video) {
          art.video.removeAttribute("src");
          art.video.load();
        }

        if (currentHlsInstanceForCleanup) {
          currentHlsInstanceForCleanup.destroy();
          if (hlsInstanceRef.current === currentHlsInstanceForCleanup) {
            hlsInstanceRef.current = null;
          }
          currentHlsInstanceForCleanup = null;
        }

        art.destroy(true);
        if (artInstanceRef.current === art) {
          artInstanceRef.current = null;
        }
      }
    };
  }, [uri, episodeInfo, animeInfo, subOrDub, getInstance, autoSkip]);

  // --- Render ---
  return (
    <div
      className={cn(
        "relative w-full h-auto bg-black overflow-hidden",
        // Eliminados todos los márgenes laterales y máximo de altura restrictivo
        "min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh]",
        rest.className ?? "",
      )}
      style={{
        // Fuerza el reproductor a pegarse a los bordes
        marginLeft: 0,
        marginRight: 0,
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      <div 
        ref={artContainerRef} 
        className="w-full h-full"
        style={{
          // Asegura que el contenedor interno también ocupe todo el espacio
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0
        }}
      >
        {!uri && (
          <div
            className="w-full h-full flex items-center justify-center bg-cover bg-center bg-gray-900"
            style={{ backgroundImage: `url(${animeInfo.image})` }}
          >
            <div className="bg-black/50 rounded-lg p-4 flex flex-col items-center">
              <Image
                width="60"
                height="60"
                src={loadingImage.src}
                alt="Cargando..."
                className="mb-2"
              />
              <span className="text-white text-sm">Cargando reproductor...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KitsunePlayer;