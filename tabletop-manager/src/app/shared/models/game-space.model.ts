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

// Game Space Options interface
export interface GameSpaceOption {
  id: string;
  game_space_id: string;
  option_key: string;
  option_value: string;
  option_type: 'boolean' | 'formula' | 'dice_rule' | 'number' | 'text';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGameSpaceOptionRequest {
  option_key: string;
  option_value: string;
  option_type?: 'boolean' | 'formula' | 'dice_rule' | 'number' | 'text';
  description?: string;
  is_active?: boolean;
}

// Game Session interface
export interface GameSession {
  id: string;
  game_space_id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  participants: string[];
  session_data: Record<string, any>;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGameSessionRequest {
  name: string;
  status?: 'planning' | 'active' | 'completed';
  participants?: string[];
  session_data?: Record<string, any>;
  started_at?: string;
}

export interface UpdateGameSessionRequest {
  name?: string;
  status?: 'planning' | 'active' | 'completed';
  participants?: string[];
  session_data?: Record<string, any>;
  started_at?: string;
  ended_at?: string;
}

export interface CreateGameSpaceOptionRequest {
  option_key: string;
  option_value: string;
  option_type?: 'boolean' | 'formula' | 'dice_rule' | 'number' | 'text';
  description?: string;
  is_active?: boolean;
}

export interface GameSpaceOption {
  id: string;
  game_space_id: string;
  option_key: string;
  option_value: string;
  option_type: 'boolean' | 'formula' | 'dice_rule' | 'number' | 'text';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}