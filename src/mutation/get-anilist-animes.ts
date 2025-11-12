import { api } from "@/lib/api";
import { AnilistAnimes } from "@/types/anilist-animes";
import { useMutation } from "react-query";

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'CURRENT': 'Viendo',
    'PLANNING': 'Planificado', 
    'COMPLETED': 'Completado',
    'DROPPED': 'Dropeado',
    'PAUSED': 'En pausa',
    'REPEATING': 'Repitiendo'
  };
  return statusMap[status] || status;
};

// Función para traducir nombres de listas
const translateListName = (name: string): string => {
  const listMap: { [key: string]: string } = {
    'Watching': 'Viendo',
    'Completed': 'Completados',
    'Planning': 'Planificados',
    'Dropped': 'Dropeados',
    'Paused': 'En pausa',
    'Rewatching': 'Volviendo a ver'
  };
  return listMap[name] || name;
};

const getAnilistAnimes = async (username: string) => {
  const res = await api.post("https://graphql.anilist.co", {
    query: `
      query ($username: String) {
        MediaListCollection(type: ANIME, userName: $username) {
          lists {
            name
            status
            isCustomList
            isSplitCompletedList
            entries {
              id
              progress
              score
              status
              repeat
              startedAt {
                year
                month
                day
              }
              completedAt {
                year
                month
                day
              }
              media {
                id
                idMal
                title {
                  romaji
                  english
                  native
                  userPreferred
                }
                description
                episodes
                duration
                status
                season
                seasonYear
                genres
                averageScore
                popularity
                bannerImage
                coverImage {
                  extraLarge
                  large
                  medium
                  color
                }
                studios {
                  edges {
                    node {
                      id
                      name
                    }
                    isMain
                  }
                }
              }
            }
          }
          user {
            id
            name
            about
            avatar {
              large
              medium
            }
            statistics {
              anime {
                count
                meanScore
                standardDeviation
                minutesWatched
                episodesWatched
              }
            }
          }
        }
      }
    `,
    variables: {
      username,
    },
  });

  const data = res.data as AnilistAnimes;
  
  // Procesar y traducir los datos
  if (data.data?.MediaListCollection?.lists) {
    data.data.MediaListCollection.lists = data.data.MediaListCollection.lists.map(list => ({
      ...list,
      name: translateListName(list.name),
      entries: list.entries?.map(entry => ({
        ...entry,
        status: translateStatus(entry.status)
      }))
    }));
  }

  return data.data;
};

export const useGetAnilistAnimes = () => {
  return useMutation({
    mutationFn: getAnilistAnimes,
    onError: (error) => {
      console.error("Error obteniendo animes de AniList:", error);
    },
  });
};