export interface TextSection {
  id: string;
  game_space_id: string;
  title: string;
  content?: string;
  section_type: 'rules' | 'lore' | 'general' | 'custom';
  order_index: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  game_space_id: string;
  name: string;
  description?: string;
  skill_type: string;
  requirements: Record<string, any>;
  effects: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CharacterClass {
  id: string;
  game_space_id: string;
  name: string;
  description?: string;
  base_stats: Record<string, any>;
  available_skills: string[];
  special_abilities: Record<string, any>;
  created_at: string;
  updated_at: string;
}