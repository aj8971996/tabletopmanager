// character-class-manager.ts
import { Component, OnInit, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { GameSpaceService } from '../game-space';
import { ContentService } from '../../../core/services/content';
import { CharacterClass, DynamicAttribute } from '../../../shared/models';

interface ClassTemplate {
  name: string;
  label: string;
  description: string;
  category: 'warrior' | 'mage' | 'rogue' | 'support' | 'hybrid';
  baseStats: Record<string, number>;
  specialAbilities: Array<{
    name: string;
    description: string;
    level: number;
  }>;
  recommendedSkills: string[];
}

@Component({
  selector: 'app-character-class-manager',
  templateUrl: './character-class-manager.html',
  styleUrls: ['./character-class-manager.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatExpansionModule,
    DragDropModule
  ]
})
export class CharacterClassManagerComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private contentService = inject(ContentService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Computed from services
  currentGameSpace = computed(() => this.gameSpaceService.currentGameSpace());
  characterClasses = computed(() => this.contentService.characterClasses());
  dynamicAttributes = computed(() => this.contentService.dynamicAttributes());
  isLoading = computed(() => this.contentService.isLoading());

  // Local signals for UI state
  private editingClassSignal = signal<CharacterClass | null>(null);
  private showTemplatesSignal = signal(false);
  private selectedTemplateSignal = signal<ClassTemplate | null>(null);

  // Computed for local state
  editingClass = computed(() => this.editingClassSignal());
  showTemplates = computed(() => this.showTemplatesSignal());
  selectedTemplate = computed(() => this.selectedTemplateSignal());

  // Forms
  classForm: FormGroup;
  searchForm: FormGroup;

  // Class templates based on common RPG archetypes
  classTemplates: ClassTemplate[] = [
    {
      name: 'warrior',
      label: 'Warrior/Fighter',
      description: 'Strong melee combatant with high physical stats',
      category: 'warrior',
      baseStats: { STR: 15, DEX: 12, CON: 14, INT: 10, WIS: 12, CHA: 10 },
      specialAbilities: [
        { name: 'Combat Expertise', description: 'Extra attack per round', level: 5 },
        { name: 'Weapon Mastery', description: 'Specialization with chosen weapon type', level: 3 }
      ],
      recommendedSkills: ['Athletics', 'Intimidation', 'Survival']
    },
    {
      name: 'mage',
      label: 'Mage/Wizard',
      description: 'Powerful spellcaster with high mental attributes',
      category: 'mage',
      baseStats: { STR: 8, DEX: 12, CON: 10, INT: 16, WIS: 14, CHA: 12 },
      specialAbilities: [
        { name: 'Spellcasting', description: 'Cast arcane spells', level: 1 },
        { name: 'Arcane Recovery', description: 'Recover spell slots on short rest', level: 3 }
      ],
      recommendedSkills: ['Arcana', 'History', 'Investigation']
    },
    {
      name: 'rogue',
      label: 'Rogue/Thief',
      description: 'Stealthy character focused on skills and precision',
      category: 'rogue',
      baseStats: { STR: 10, DEX: 16, CON: 12, INT: 12, WIS: 14, CHA: 10 },
      specialAbilities: [
        { name: 'Sneak Attack', description: 'Extra damage when attacking with advantage', level: 1 },
        { name: 'Cunning Action', description: 'Dash, Disengage, or Hide as bonus action', level: 2 }
      ],
      recommendedSkills: ['Stealth', 'Sleight of Hand', 'Perception']
    },
    {
      name: 'cleric',
      label: 'Cleric/Priest',
      description: 'Divine magic user with support and healing abilities',
      category: 'support',
      baseStats: { STR: 12, DEX: 10, CON: 13, INT: 10, WIS: 16, CHA: 14 },
      specialAbilities: [
        { name: 'Divine Magic', description: 'Cast divine spells', level: 1 },
        { name: 'Channel Divinity', description: 'Use divine power for special effects', level: 2 }
      ],
      recommendedSkills: ['Medicine', 'Religion', 'Insight']
    },
    {
      name: 'ranger',
      label: 'Ranger/Scout',
      description: 'Nature warrior with tracking and survival skills',
      category: 'hybrid',
      baseStats: { STR: 13, DEX: 15, CON: 14, INT: 11, WIS: 14, CHA: 10 },
      specialAbilities: [
        { name: 'Favored Enemy', description: 'Bonus against chosen creature type', level: 1 },
        { name: 'Natural Explorer', description: 'Benefits in chosen terrain', level: 1 }
      ],
      recommendedSkills: ['Survival', 'Animal Handling', 'Nature']
    }
  ];

  constructor() {
    // Initialize forms
    this.classForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      base_stats: this.fb.group({}),
      special_abilities: this.fb.array([]),
      available_skills: ['']
    });

    this.searchForm = this.fb.group({
      search: ['']
    });

    // Auto-show templates when no classes exist
    this.setupAutoTemplateDisplay();
  }

  ngOnInit() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) {
      this.snackBar.open('No game space selected', 'Dismiss', { duration: 3000 });
      return;
    }

    this.loadCharacterClasses();
    this.setupBaseStatsForm();
  }

  private async loadCharacterClasses() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) return;

    try {
      await this.contentService.loadCharacterClasses(gameSpace.id);
    } catch (error) {
      console.error('Error loading character classes:', error);
      this.snackBar.open('Error loading character classes. Please refresh the page.', 'Dismiss', { 
        duration: 5000 
      });
    }
  }

  private setupBaseStatsForm() {
    // Create form controls for each dynamic attribute
    const baseStatsGroup = this.fb.group({});
    this.dynamicAttributes().forEach(attr => {
      baseStatsGroup.addControl(attr.attribute_name, this.fb.control(attr.base_value, [
        Validators.min(attr.min_value),
        Validators.max(attr.max_value)
      ]));
    });

    this.classForm.setControl('base_stats', baseStatsGroup);
  }

  private setupAutoTemplateDisplay() {
    const classesEmpty = computed(() => this.characterClasses().length === 0);
    if (classesEmpty()) {
      this.showTemplatesSignal.set(true);
    }
  }

  // Template Management
  onSelectTemplate(template: ClassTemplate) {
    this.selectedTemplateSignal.set(template);
  }

  clearSelectedTemplate() {
    this.selectedTemplateSignal.set(null);
  }

  async onApplyTemplate() {
    const template = this.selectedTemplate();
    const gameSpace = this.currentGameSpace();
    
    if (!template || !gameSpace) return;

    // Check if class with same name already exists
    const existingNames = this.characterClasses().map(cls => cls.name.toLowerCase());
    if (existingNames.includes(template.label.toLowerCase())) {
      const proceed = confirm(
        `A class named "${template.label}" already exists. Do you want to create "${template.label} (Copy)" instead?`
      );
      if (!proceed) return;
    }

    try {
      // Map template base stats to current attributes
      const mappedBaseStats: Record<string, number> = {};
      this.dynamicAttributes().forEach(attr => {
        const templateValue = template.baseStats[attr.attribute_name];
        if (templateValue !== undefined) {
          // Ensure value is within attribute bounds
          const clampedValue = Math.max(
            attr.min_value,
            Math.min(attr.max_value, templateValue)
          );
          mappedBaseStats[attr.attribute_name] = clampedValue;
        } else {
          mappedBaseStats[attr.attribute_name] = attr.base_value;
        }
      });

      const className = existingNames.includes(template.label.toLowerCase()) 
        ? `${template.label} (Copy)`
        : template.label;

      const request = {
        name: className,
        description: template.description,
        base_stats: mappedBaseStats,
        special_abilities: {
          category: template.category,
          abilities: template.specialAbilities
        },
        available_skills: template.recommendedSkills
      };

      const result = await this.contentService.createCharacterClass(gameSpace.id, request);
      if (result) {
        this.selectedTemplateSignal.set(null);
        this.snackBar.open(`Applied ${template.label} template successfully!`, 'Dismiss', { duration: 4000 });
        
        // Hide templates section after successful application
        this.showTemplatesSignal.set(false);
      } else {
        this.snackBar.open('Error applying template. Please try again.', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error applying template:', error);
      this.snackBar.open('Error applying template. Please try again.', 'Dismiss', { duration: 3000 });
    }
  }

  toggleTemplates() {
    this.showTemplatesSignal.set(!this.showTemplates());
    if (!this.showTemplates()) {
      this.selectedTemplateSignal.set(null);
    }
  }

  // Class CRUD Operations
  async onCreateClass() {
    if (this.classForm.invalid) {
      this.markFormGroupTouched(this.classForm);
      this.snackBar.open('Please fill in all required fields correctly', 'Dismiss', { duration: 3000 });
      return;
    }

    const gameSpace = this.currentGameSpace();
    if (!gameSpace) {
      this.snackBar.open('No game space selected', 'Dismiss', { duration: 3000 });
      return;
    }

    const formValue = this.classForm.value;
    
    // Check for duplicate class names
    const existingNames = this.characterClasses().map(cls => cls.name.toLowerCase());
    if (existingNames.includes(formValue.name.toLowerCase())) {
      this.snackBar.open('A class with this name already exists', 'Dismiss', { duration: 3000 });
      return;
    }

    const request = {
      name: formValue.name,
      description: formValue.description,
      base_stats: formValue.base_stats,
      special_abilities: this.getSpecialAbilitiesValue(),
      available_skills: this.parseSkillsList(formValue.available_skills)
    };

    try {
      const result = await this.contentService.createCharacterClass(gameSpace.id, request);
      if (result) {
        this.resetForm();
        this.snackBar.open(`Character class "${result.name}" created successfully!`, 'Dismiss', { duration: 3000 });
        
        // Hide templates section after creating first class
        if (this.characterClasses().length === 1) {
          this.showTemplatesSignal.set(false);
        }
      } else {
        this.snackBar.open('Error creating character class. Please try again.', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error creating character class:', error);
      this.snackBar.open('Error creating character class. Please check your connection and try again.', 'Dismiss', { 
        duration: 4000 
      });
    }
  }

  onEditClass(characterClass: CharacterClass) {
    this.editingClassSignal.set(characterClass);
    
    // Setup base stats form with current values
    this.setupBaseStatsForm();
    
    this.classForm.patchValue({
      name: characterClass.name,
      description: characterClass.description,
      base_stats: characterClass.base_stats,
      available_skills: Array.isArray(characterClass.available_skills) 
        ? characterClass.available_skills.join(', ') 
        : ''
    });

    // Setup special abilities
    this.setSpecialAbilitiesValue(characterClass.special_abilities || {});

    // Scroll form into view on mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        const formElement = document.querySelector('.form-section');
        formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  async onUpdateClass() {
    const editing = this.editingClass();
    if (!editing || this.classForm.invalid) {
      this.markFormGroupTouched(this.classForm);
      return;
    }

    const formValue = this.classForm.value;
    
    // Check for duplicate names (excluding current class)
    const existingNames = this.characterClasses()
      .filter(cls => cls.id !== editing.id)
      .map(cls => cls.name.toLowerCase());
    
    if (existingNames.includes(formValue.name.toLowerCase())) {
      this.snackBar.open('A class with this name already exists', 'Dismiss', { duration: 3000 });
      return;
    }

    const updates = {
      name: formValue.name,
      description: formValue.description,
      base_stats: formValue.base_stats,
      special_abilities: this.getSpecialAbilitiesValue(),
      available_skills: this.parseSkillsList(formValue.available_skills)
    };

    try {
      const result = await this.contentService.updateCharacterClass(editing.id, updates);
      if (result) {
        this.cancelEdit();
        this.snackBar.open(`Character class "${result.name}" updated successfully!`, 'Dismiss', { duration: 3000 });
      } else {
        this.snackBar.open('Error updating character class. Please try again.', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error updating character class:', error);
      this.snackBar.open('Error updating character class. Please check your connection and try again.', 'Dismiss', { 
        duration: 4000 
      });
    }
  }

  async onDeleteClass(characterClass: CharacterClass) {
    const confirmMessage = `Are you sure you want to delete "${characterClass.name}"?\n\nThis will affect all characters using this class and cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      const gameSpace = this.currentGameSpace();
      if (!gameSpace) return;

      try {
        const success = await this.contentService.deleteCharacterClass(characterClass.id, gameSpace.id);
        if (success) {
          this.snackBar.open(`Character class "${characterClass.name}" deleted successfully!`, 'Dismiss', { duration: 3000 });
          
          // Show templates section if no classes remain
          if (this.characterClasses().length === 0) {
            this.showTemplatesSignal.set(true);
          }
        } else {
          this.snackBar.open('Error deleting character class. Please try again.', 'Dismiss', { duration: 3000 });
        }
      } catch (error) {
        console.error('Error deleting character class:', error);
        this.snackBar.open('Error deleting character class. Please check your connection and try again.', 'Dismiss', { 
          duration: 4000 
        });
      }
    }
  }

  cancelEdit() {
    this.editingClassSignal.set(null);
    this.resetForm();
  }

  private resetForm() {
    this.classForm.reset();
    this.setupBaseStatsForm();
    this.setSpecialAbilitiesValue({});
  }

  // Special Abilities Form Array Management
  get specialAbilitiesArray(): FormArray {
    return this.classForm.get('special_abilities') as FormArray;
  }

  addSpecialAbility() {
    const abilityGroup = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      level: [1, [Validators.min(1), Validators.max(20)]]
    });
    this.specialAbilitiesArray.push(abilityGroup);
  }

  removeSpecialAbility(index: number) {
    this.specialAbilitiesArray.removeAt(index);
  }

  private getSpecialAbilitiesValue(): Record<string, any> {
    const abilities = this.specialAbilitiesArray.value;
    return {
      abilities: abilities || []
    };
  }

  private setSpecialAbilitiesValue(specialAbilities: Record<string, any>) {
    // Clear existing abilities
    while (this.specialAbilitiesArray.length !== 0) {
      this.specialAbilitiesArray.removeAt(0);
    }

    // Add abilities from the class
    const abilities = specialAbilities?.['abilities'] || [];
    abilities.forEach((ability: any) => {
      const abilityGroup = this.fb.group({
        name: [ability.name || '', Validators.required],
        description: [ability.description || '', Validators.required],
        level: [ability.level || 1, [Validators.min(1), Validators.max(20)]]
      });
      this.specialAbilitiesArray.push(abilityGroup);
    });
  }

  // Utility methods
  private parseSkillsList(skillsString: string): string[] {
    if (!skillsString) return [];
    return skillsString.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }

  getClassCategoryIcon(category: string): string {
    switch (category) {
      case 'warrior': return 'shield';
      case 'mage': return 'auto_fix_high';
      case 'rogue': return 'visibility_off';
      case 'support': return 'healing';
      case 'hybrid': return 'dynamic_form';
      default: return 'person';
    }
  }

  getClassCategoryColor(category: string): string {
    switch (category) {
      case 'warrior': return 'var(--color-error)';
      case 'mage': return 'var(--color-primary)';
      case 'rogue': return 'var(--color-warning)';
      case 'support': return 'var(--color-success)';
      case 'hybrid': return 'var(--color-info)';
      default: return 'var(--color-on-surface-variant)';
    }
  }

  isFormValid(): boolean {
    return this.classForm.valid;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Drag and Drop for reordering (if needed later)
  onDrop(event: CdkDragDrop<CharacterClass[]>) {
    const classes = [...this.characterClasses()];
    moveItemInArray(classes, event.previousIndex, event.currentIndex);
    
    // Could implement display order updates here if needed
    this.snackBar.open('Class order updated', 'Dismiss', { duration: 2000 });
  }
}