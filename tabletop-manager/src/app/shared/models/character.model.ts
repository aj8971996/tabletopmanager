export interface Character {
  id: string;
  game_space_id: string;
  name: string;
  character_type: 'pc' | 'npc';
  owner_user_id?: string;
  character_data: Record<string, any>;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterRequest {
  name: string;
  character_type: 'pc' | 'npc';
  character_data?: Record<string, any>;
  notes?: string;
}