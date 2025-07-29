"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetHomePageData } from "@/query/get-home-page-data";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";

// Dynamically import components
const HeroSection = dynamic(() => import("@/components/hero-section"));
const LatestEpisodesAnime = dynamic(
  () => import("@/components/latest-episodes-section"),
);
const AnimeSchedule = dynamic(() => import("@/components/anime-schedule"));
const AnimeSections = dynamic(() => import("@/components/anime-sections"));

export default function Home() {
  const { data, isLoading } = useGetHomePageData();

  return (
    <div className="flex flex-col bg-[#121212]">
      <HeroSection
        spotlightAnime={data?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />
      <LatestEpisodesAnime
        loading={isLoading}
        latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
      />

      <ContinueWatching loading={isLoading} />

      <FeaturedCollection
        loading={isLoading}
        featuredAnime={[
          {
            title: "Anime más favorito",
            anime: data?.mostFavoriteAnimes as IAnime[],
          },
          {
            title: "Los más populares",
            anime: data?.mostPopularAnimes as IAnime[],
          },
          {
            title: "Último anime terminado",
            anime: data?.latestCompletedAnimes as LatestCompletedAnime[],
          },
        ]}
      />
      <AnimeSections
        title={"Animes en tendencia"}
        trendingAnime={data?.trendingAnimes as IAnime[]}
        loading={isLoading}
      />

      <AnimeSchedule />

      <AnimeSections
        title={"Próximos animes"}
        trendingAnime={data?.topUpcomingAnimes as IAnime[]}
        loading={isLoading}
      />
    </div>
  );
}
