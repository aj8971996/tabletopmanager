// Base GameSpace interface matching your database schema
export interface GameSpace {
  id: string;
  name: string;
  description?: string;
  gm_user_id: string;
  created_at: string;
  updated_at: string;
}

// Game Space Member interface
export interface GameSpaceMember {
  id: string;
  game_space_id: string;
  user_id: string;
  role: 'gm' | 'player';
  joined_at: string;
}

// Extended GameSpace with relationships (for queries with joins)
export interface GameSpaceWithMembers extends GameSpace {
  game_space_members?: GameSpaceMember[];
  member_count?: number;
}

// For creating new game spaces
export interface CreateGameSpaceRequest {
  name: string;
  description?: string;
}