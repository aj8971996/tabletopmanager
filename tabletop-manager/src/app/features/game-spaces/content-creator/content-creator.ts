// content-creator.component.ts
import { Component, inject, OnInit, ChangeDetectionStrategy, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';

import { GameSpaceService } from '../game-space';
import { ContentService } from '../../../core/services/content';
import { CreateTextSectionRequest, TextSection } from '../../../shared/models';

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'rules' | 'lore' | 'general' | 'custom';
  icon: string;
  template: string;
  placeholders: Array<{
    key: string;
    label: string;
    description: string;
    required: boolean;
  }>;
}

interface ContentCategory {
  type: 'rules' | 'lore' | 'general' | 'custom';
  label: string;
  icon: string;
  description: string;
  color: string;
  examples: string[];
}

@Component({
  selector: 'app-content-creator',
  templateUrl: './content-creator.html',
  styleUrls: ['./content-creator.scss'],
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
    MatChipsModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatStepperModule,
    MatDividerModule
  ]
})
export class ContentCreatorComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private contentService = inject(ContentService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  // Service signals
  currentGameSpace = this.gameSpaceService.currentGameSpace;
  isLoading = this.contentService.isLoading;

  // Local signals
  private creationModeSignal = signal<'blank' | 'template' | 'import'>('blank');
  private selectedTemplateSignal = signal<ContentTemplate | null>(null);
  private selectedCategorySignal = signal<'rules' | 'lore' | 'general' | 'custom'>('general');
  private savingSignal = signal(false);
  private previewModeSignal = signal(false);

  // Output events
  contentCreated = output<TextSection>();
  cancelled = output<void>();

  // Public computed signals
  creationMode = computed(() => this.creationModeSignal());
  selectedTemplate = computed(() => this.selectedTemplateSignal());
  selectedCategory = computed(() => this.selectedCategorySignal());
  isSaving = computed(() => this.savingSignal());
  isPreviewMode = computed(() => this.previewModeSignal());

  // Content categories with examples
  contentCategories: ContentCategory[] = [
    {
      type: 'rules',
      label: 'Rules & Mechanics',
      icon: 'gavel',
      description: 'Game rules, mechanics, and system information',
      color: 'primary',
      examples: ['Combat Rules', 'Skill Checks', 'Character Creation', 'Magic System']
    },
    {
      type: 'lore',
      label: 'Lore & Worldbuilding',
      icon: 'public',
      description: 'World history, locations, cultures, and background',
      color: 'accent',
      examples: ['Kingdom History', 'Notable NPCs', 'Locations', 'Cultural Information']
    },
    {
      type: 'general',
      label: 'General Information',
      icon: 'info',
      description: 'General game information and reference materials',
      color: 'warn',
      examples: ['Session Notes', 'House Rules', 'Quick Reference', 'Player Guides']
    },
    {
      type: 'custom',
      label: 'Custom Content',
      icon: 'edit_note',
      description: 'Custom sections and miscellaneous content',
      color: 'primary',
      examples: ['Campaign Hooks', 'Random Tables', 'Homebrew Rules', 'Custom Mechanics']
    }
  ];

  // Content templates for quick creation
  contentTemplates: ContentTemplate[] = [
    {
      id: 'npc-template',
      name: 'NPC Profile',
      description: 'Create a detailed non-player character profile',
      category: 'lore',
      icon: 'person',
      template: `# {{name}}

## Basic Information
- **Race/Species:** {{race}}
- **Occupation:** {{occupation}}
- **Location:** {{location}}
- **Alignment:** {{alignment}}

## Appearance
{{appearance}}

## Personality
{{personality}}

## Background
{{background}}

## Motivations & Goals
{{motivations}}

## Notable Possessions
{{possessions}}

## Relationships
{{relationships}}

## Plot Hooks
{{plot_hooks}}`,
      placeholders: [
        { key: 'name', label: 'Character Name', description: 'The NPC\'s full name', required: true },
        { key: 'race', label: 'Race/Species', description: 'What race or species is this character?', required: false },
        { key: 'occupation', label: 'Occupation', description: 'What does this character do for work?', required: false },
        { key: 'location', label: 'Location', description: 'Where can this character typically be found?', required: false },
        { key: 'alignment', label: 'Alignment', description: 'Character\'s moral alignment', required: false },
        { key: 'appearance', label: 'Appearance', description: 'Physical description of the character', required: false },
        { key: 'personality', label: 'Personality', description: 'Key personality traits and mannerisms', required: false },
        { key: 'background', label: 'Background', description: 'Character\'s history and background story', required: false },
        { key: 'motivations', label: 'Motivations', description: 'What drives this character?', required: false },
        { key: 'possessions', label: 'Possessions', description: 'Important items the character owns', required: false },
        { key: 'relationships', label: 'Relationships', description: 'Important relationships with other characters', required: false },
        { key: 'plot_hooks', label: 'Plot Hooks', description: 'Ways to involve this character in the story', required: false }
      ]
    },
    {
      id: 'location-template',
      name: 'Location Description',
      description: 'Describe a place in your world',
      category: 'lore',
      icon: 'place',
      template: `# {{name}}

## Overview
{{overview}}

## Geography
{{geography}}

## Population & Demographics
{{population}}

## Notable Features
{{features}}

## Important Locations
{{locations}}

## History
{{history}}

## Current Events
{{events}}

## Adventure Hooks
{{hooks}}`,
      placeholders: [
        { key: 'name', label: 'Location Name', description: 'Name of the place', required: true },
        { key: 'overview', label: 'Overview', description: 'Brief description of the location', required: true },
        { key: 'geography', label: 'Geography', description: 'Physical features and layout', required: false },
        { key: 'population', label: 'Population', description: 'Who lives here and in what numbers?', required: false },
        { key: 'features', label: 'Notable Features', description: 'Interesting or important features', required: false },
        { key: 'locations', label: 'Sub-locations', description: 'Important places within this location', required: false },
        { key: 'history', label: 'History', description: 'Historical background of the location', required: false },
        { key: 'events', label: 'Current Events', description: 'What\'s happening here now?', required: false },
        { key: 'hooks', label: 'Adventure Hooks', description: 'Plot opportunities for this location', required: false }
      ]
    },
    {
      id: 'rule-template',
      name: 'Custom Rule',
      description: 'Document a custom game rule or mechanic',
      category: 'rules',
      icon: 'rule',
      template: `# {{rule_name}}

## Summary
{{summary}}

## When to Use
{{when_to_use}}

## How It Works
{{mechanics}}

## Examples
{{examples}}

## Variations (Optional)
{{variations}}

## Designer Notes
{{notes}}`,
      placeholders: [
        { key: 'rule_name', label: 'Rule Name', description: 'Name of the custom rule', required: true },
        { key: 'summary', label: 'Summary', description: 'Brief explanation of what this rule does', required: true },
        { key: 'when_to_use', label: 'When to Use', description: 'Situations where this rule applies', required: true },
        { key: 'mechanics', label: 'Mechanics', description: 'Step-by-step explanation of how the rule works', required: true },
        { key: 'examples', label: 'Examples', description: 'Examples of the rule in action', required: false },
        { key: 'variations', label: 'Variations', description: 'Alternative ways to use this rule', required: false },
        { key: 'notes', label: 'Designer Notes', description: 'Additional notes or reasoning behind the rule', required: false }
      ]
    },
    {
      id: 'session-template',
      name: 'Session Summary',
      description: 'Document a game session',
      category: 'general',
      icon: 'event_note',
      template: `# Session {{session_number}} - {{date}}

## Session Summary
{{summary}}

## Characters Present
{{characters}}

## Key Events
{{events}}

## NPCs Encountered
{{npcs}}

## Locations Visited
{{locations}}

## Loot & Rewards
{{loot}}

## Experience Gained
{{experience}}

## Ongoing Plot Threads
{{plot_threads}}

## Next Session Preview
{{next_session}}`,
      placeholders: [
        { key: 'session_number', label: 'Session Number', description: 'Session number or identifier', required: true },
        { key: 'date', label: 'Date', description: 'Date the session was played', required: true },
        { key: 'summary', label: 'Summary', description: 'Brief overview of what happened', required: true },
        { key: 'characters', label: 'Characters', description: 'Which player characters were present', required: false },
        { key: 'events', label: 'Key Events', description: 'Important things that happened', required: false },
        { key: 'npcs', label: 'NPCs', description: 'Non-player characters the party interacted with', required: false },
        { key: 'locations', label: 'Locations', description: 'Places the party visited', required: false },
        { key: 'loot', label: 'Loot', description: 'Items and treasures found', required: false },
        { key: 'experience', label: 'Experience', description: 'XP or advancement gained', required: false },
        { key: 'plot_threads', label: 'Plot Threads', description: 'Ongoing storylines and unresolved issues', required: false },
        { key: 'next_session', label: 'Next Session', description: 'Preview or plans for the next session', required: false }
      ]
    }
  ];

  // Forms
  categoryForm: FormGroup;
  contentForm: FormGroup;
  templateForm: FormGroup;

  // Computed filtered templates
  filteredTemplates = computed(() => {
    const category = this.selectedCategorySignal();
    return this.contentTemplates.filter(template => template.category === category);
  });

  constructor() {
    this.categoryForm = this.fb.group({
      category: ['general', Validators.required]
    });

    this.contentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: ['', [Validators.required, Validators.minLength(10)]],
      is_public: [true],
      order_index: [this.getNextOrderIndex()]
    });

    this.templateForm = this.fb.group({});
  }

  ngOnInit() {
    // Set initial category from form
    this.categoryForm.get('category')?.valueChanges.subscribe(category => {
      this.selectedCategorySignal.set(category);
      this.selectedTemplateSignal.set(null); // Clear template when category changes
    });
  }

  onModeSelect(mode: 'blank' | 'template' | 'import') {
    this.creationModeSignal.set(mode);
    this.selectedTemplateSignal.set(null);
    this.resetForms();
  }

  onCategorySelect(category: 'rules' | 'lore' | 'general' | 'custom') {
    this.selectedCategorySignal.set(category);
    this.categoryForm.patchValue({ category });
    this.selectedTemplateSignal.set(null);
  }

  onTemplateSelect(template: ContentTemplate) {
    this.selectedTemplateSignal.set(template);
    this.selectedCategorySignal.set(template.category);
    this.categoryForm.patchValue({ category: template.category });
    
    // Create dynamic form for template placeholders
    this.buildTemplateForm(template);
    
    // Set a default title
    this.contentForm.patchValue({
      title: `New ${template.name}`,
      content: template.template,
      is_public: true,
      order_index: this.getNextOrderIndex()
    });
  }

  private buildTemplateForm(template: ContentTemplate) {
    const controls: { [key: string]: any } = {};
    
    template.placeholders.forEach(placeholder => {
      const validators = placeholder.required ? [Validators.required] : [];
      controls[placeholder.key] = ['', validators];
    });
    
    this.templateForm = this.fb.group(controls);
  }

  onTemplateFormChange() {
    const template = this.selectedTemplate();
    if (!template) return;

    const placeholderValues = this.templateForm.value;
    let processedContent = template.template;

    // Replace placeholders with form values
    template.placeholders.forEach(placeholder => {
      const value = placeholderValues[placeholder.key] || `[${placeholder.label}]`;
      const regex = new RegExp(`{{${placeholder.key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    this.contentForm.patchValue({
      content: processedContent
    });
  }

  onPreviewToggle() {
    this.previewModeSignal.set(!this.isPreviewMode());
  }

  async onSave() {
    if (!this.contentForm.valid || !this.currentGameSpace()) {
      return;
    }

    this.savingSignal.set(true);

    try {
      const formValue = this.contentForm.value;
      const gameSpaceId = this.currentGameSpace()!.id;

      const request: CreateTextSectionRequest = {
        title: formValue.title,
        content: formValue.content,
        section_type: this.selectedCategory(),
        is_public: formValue.is_public,
        order_index: formValue.order_index
      };

      const created = await this.contentService.createTextSection(gameSpaceId, request);
      
      if (created) {
        this.snackBar.open('Content created successfully', 'Dismiss', { duration: 3000 });
        this.contentCreated.emit(created);
        this.resetForms();
      } else {
        this.snackBar.open('Error creating content', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error saving content:', error);
      this.snackBar.open('Error saving content', 'Dismiss', { duration: 3000 });
    } finally {
      this.savingSignal.set(false);
    }
  }

  onCancel() {
    this.resetForms();
    this.cancelled.emit();
  }

  private resetForms() {
    this.contentForm.reset({
      is_public: true,
      order_index: this.getNextOrderIndex()
    });
    this.templateForm.reset();
    this.previewModeSignal.set(false);
  }

  private getNextOrderIndex(): number {
    const sections = this.contentService.textSections();
    if (sections.length === 0) return 0;
    return Math.max(...sections.map(s => s.order_index)) + 1;
  }

  getCategoryInfo(type: string): ContentCategory | undefined {
    return this.contentCategories.find(cat => cat.type === type);
  }

  // File import functionality
  onFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    this.importFromFile(file);
  }

  private async importFromFile(file: File) {
    try {
      const content = await this.readFileContent(file);
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      
      this.contentForm.patchValue({
        title: nameWithoutExtension,
        content: content
      });
      
      this.snackBar.open('File imported successfully', 'Dismiss', { duration: 3000 });
    } catch (error) {
      console.error('Error importing file:', error);
      this.snackBar.open('Error importing file', 'Dismiss', { duration: 3000 });
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  }
}