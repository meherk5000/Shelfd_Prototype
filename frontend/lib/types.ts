export type MediaType = "books" | "movies" | "tv-shows" | "articles"; 

export interface ClubData {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  creator_username: string;
  creator_avatar?: string;
  member_count: number;
  media_type: string;
  is_private: boolean;
  created_at: string;
  is_member: boolean;
  is_creator: boolean;
  cover_image: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover: string | null;
  book_id: string | null;
  movie_title: string | null;
  movie_director: string | null;
  movie_poster: string | null;
  movie_id: string | null;
  tv_title: string | null;
  tv_creator: string | null;
  tv_poster: string | null;
  tv_id: string | null;
  tv_year: number | null;
  tv_season: number | null;
  tv_episode: number | null;
} 