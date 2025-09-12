import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';

import { GameSpaceService } from '../game-space';
import { CreateGameSpaceRequest, CreateGameSpaceOptionRequest } from '../../../shared/models';

interface GameSystemTemplate {
  id: string;
  name: string;
  description: string;
  defaultAttributes: Array<{
    name: string;
    label: string;
    min: number;
    max: number;
    default: number;
  }>;
  defaultOptions: Array<{
    key: string;
    value: string;
    type: 'boolean' | 'number' | 'text';
    description: string;
  }>;
}

@Component({
  selector: 'app-game-space-creation-dialog',
  templateUrl: './game-space-creation-dialog.html',
  styleUrls: ['./game-space-creation-dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatCheckboxModule,
    MatSelectModule,
    MatChipsModule,
    MatCardModule
  ]
})
export class GameSpaceCreationDialogComponent {
  private fb = inject(FormBuilder);
  private gameSpaceService = inject(GameSpaceService);
  private dialogRef = inject(MatDialogRef<GameSpaceCreationDialogComponent>);

  private isCreatingSignal = signal(false);
  public isCreating = computed(() => this.isCreatingSignal());

  // Game system templates
  public gameSystemTemplates: GameSystemTemplate[] = [
    {
      id: 'custom',
      name: 'Custom System',
      description: 'Start from scratch and build your own system',
      defaultAttributes: [],
      defaultOptions: []
    },
    {
      id: 'dnd5e',
      name: 'D&D 5th Edition',
      description: 'Classic D&D with six core attributes',
      defaultAttributes: [
        { name: 'strength', label: 'Strength', min: 1, max: 20, default: 10 },
        { name: 'dexterity', label: 'Dexterity', min: 1, max: 20, default: 10 },
        { name: 'constitution', label: 'Constitution', min: 1, max: 20, default: 10 },
        { name: 'intelligence', label: 'Intelligence', min: 1, max: 20, default: 10 },
        { name: 'wisdom', label: 'Wisdom', min: 1, max: 20, default: 10 },
        { name: 'charisma', label: 'Charisma', min: 1, max: 20, default: 10 }
      ],
      defaultOptions: [
        { key: 'allow_multiclassing', value: 'true', type: 'boolean', description: 'Allow characters to have multiple classes' },
        { key: 'use_inspiration', value: 'true', type: 'boolean', description: 'Enable inspiration mechanics' },
        { key: 'starting_level', value: '1', type: 'number', description: 'Default starting level for new characters' }
      ]
    },
    {
      id: 'pathfinder',
      name: 'Pathfinder',
      description: 'Pathfinder RPG system with expanded options',
      defaultAttributes: [
        { name: 'strength', label: 'Strength', min: 1, max: 25, default: 10 },
        { name: 'dexterity', label: 'Dexterity', min: 1, max: 25, default: 10 },
        { name: 'constitution', label: 'Constitution', min: 1, max: 25, default: 10 },
        { name: 'intelligence', label: 'Intelligence', min: 1, max: 25, default: 10 },
        { name: 'wisdom', label: 'Wisdom', min: 1, max: 25, default: 10 },
        { name: 'charisma', label: 'Charisma', min: 1, max: 25, default: 10 }
      ],
      defaultOptions: [
        { key: 'allow_multiclassing', value: 'true', type: 'boolean', description: 'Allow characters to have multiple classes' },
        { key: 'use_hero_points', value: 'true', type: 'boolean', description: 'Enable hero point mechanics' },
        { key: 'starting_level', value: '1', type: 'number', description: 'Default starting level for new characters' }
      ]
    },
    {
      id: 'world_of_darkness',
      name: 'World of Darkness',
      description: 'Storyteller system with dots instead of numbers',
      defaultAttributes: [
        { name: 'strength', label: 'Strength', min: 0, max: 5, default: 1 },
        { name: 'dexterity', label: 'Dexterity', min: 0, max: 5, default: 1 },
        { name: 'stamina', label: 'Stamina', min: 0, max: 5, default: 1 },
        { name: 'charisma', label: 'Charisma', min: 0, max: 5, default: 1 },
        { name: 'manipulation', label: 'Manipulation', min: 0, max: 5, default: 1 },
        { name: 'composure', label: 'Composure', min: 0, max: 5, default: 1 },
        { name: 'intelligence', label: 'Intelligence', min: 0, max: 5, default: 1 },
        { name: 'wits', label: 'Wits', min: 0, max: 5, default: 1 },
        { name: 'resolve', label: 'Resolve', min: 0, max: 5, default: 1 }
      ],
      defaultOptions: [
        { key: 'use_willpower', value: 'true', type: 'boolean', description: 'Enable willpower mechanics' },
        { key: 'morality_system', value: 'humanity', type: 'text', description: 'Type of morality system to use' }
      ]
    }
  ];

  // Form groups
  public basicInfoForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    gameSystem: ['custom', Validators.required]
  });

  public settingsForm = this.fb.group({
    selectedOptions: [[] as string[]],
    customOptions: this.fb.array([])
  });

  public get selectedTemplate(): GameSystemTemplate {
    const systemId = this.basicInfoForm.get('gameSystem')?.value || 'custom';
    return this.gameSystemTemplates.find(t => t.id === systemId) || this.gameSystemTemplates[0];
  }

  public async onCreate() {
    if (this.basicInfoForm.invalid) {
      this.basicInfoForm.markAllAsTouched();
      return;
    }

    this.isCreatingSignal.set(true);

    try {
      // Create the game space
      const gameSpaceRequest: CreateGameSpaceRequest = {
        name: this.basicInfoForm.get('name')?.value || '',
        description: this.basicInfoForm.get('description')?.value || undefined
      };

      const gameSpace = await this.gameSpaceService.createGameSpace(gameSpaceRequest);
      
      if (!gameSpace) {
        throw new Error('Failed to create game space');
      }

      // Create default options based on selected template
      const template = this.selectedTemplate;
      const optionsToCreate: CreateGameSpaceOptionRequest[] = [];

      // Add template default options
      for (const option of template.defaultOptions) {
        optionsToCreate.push({
          option_key: option.key,
          option_value: option.value,
          option_type: option.type,
          description: option.description,
          is_active: true
        });
      }

      // Add selected custom options
      const selectedOptions = this.settingsForm.get('selectedOptions')?.value || [];
      for (const optionKey of selectedOptions) {
        if (!optionsToCreate.find(o => o.option_key === optionKey)) {
          // Add additional options based on selection
          optionsToCreate.push({
            option_key: optionKey,
            option_value: 'true',
            option_type: 'boolean',
            description: `Enable ${optionKey.replace(/_/g, ' ')} feature`,
            is_active: true
          });
        }
      }

      // Create the options
      for (const optionRequest of optionsToCreate) {
        await this.gameSpaceService.createGameSpaceOption(gameSpace.id, optionRequest);
      }

      // Close dialog and return the created game space
      this.dialogRef.close({
        gameSpace,
        template: this.selectedTemplate,
        success: true
      });

    } catch (error) {
      console.error('Error creating game space:', error);
      // You could add a toast notification here
    } finally {
      this.isCreatingSignal.set(false);
    }
  }

  public onCancel() {
    this.dialogRef.close({ success: false });
  }

  // Template selection helper
  public onTemplateSelect(template: GameSystemTemplate) {
    this.basicInfoForm.patchValue({ gameSystem: template.id });
  }

  // Get form field error messages
  public getFieldError(fieldName: string, formGroup = this.basicInfoForm): string | null {
    const field = formGroup.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${fieldName} must be less than ${field.errors['maxlength'].requiredLength} characters`;
    }
    return null;
  }

  // Helper method to format option keys
  public formatOptionKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}