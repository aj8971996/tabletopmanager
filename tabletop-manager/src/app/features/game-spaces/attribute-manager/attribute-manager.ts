import { Component, OnInit, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { GameSpaceService } from '../game-space';
import { ContentService } from '../../../core/services/content';
import { DynamicAttribute, CreateDynamicAttributeRequest } from '../../../shared/models';

interface AttributeTemplate {
  name: string;
  label: string;
  type: 'physical' | 'mental' | 'social' | 'custom';
  attributes: Array<{
    name: string;
    label: string;
    min: number;
    max: number;
    default: number;
    description: string;
  }>;
}

@Component({
  selector: 'app-attribute-manager',
  templateUrl: './attribute-manager.html',
  styleUrls: ['./attribute-manager.scss'],
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
    DragDropModule
  ]
})
export class AttributeManagerComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private contentService = inject(ContentService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Computed from services
  currentGameSpace = computed(() => this.gameSpaceService.currentGameSpace());
  dynamicAttributes = computed(() => this.contentService.dynamicAttributes());
  coreAttributes = computed(() => this.contentService.coreAttributes());
  isLoading = computed(() => this.contentService.isLoading());

  // Local signals for UI state
  private editingAttributeSignal = signal<DynamicAttribute | null>(null);
  private showTemplatesSignal = signal(false);
  private selectedTemplateSignal = signal<AttributeTemplate | null>(null);

  // Computed for local state
  editingAttribute = computed(() => this.editingAttributeSignal());
  showTemplates = computed(() => this.showTemplatesSignal());
  selectedTemplate = computed(() => this.selectedTemplateSignal());

  // Forms
  attributeForm: FormGroup;
  searchForm: FormGroup;

  // Enhanced attribute templates with better descriptions
  attributeTemplates: AttributeTemplate[] = [
    {
      name: 'D&D 5e Standard',
      label: 'Dungeons & Dragons 5th Edition',
      type: 'physical',
      attributes: [
        { name: 'STR', label: 'Strength', min: 1, max: 20, default: 10, description: 'Physical power and muscle strength for melee combat and lifting' },
        { name: 'DEX', label: 'Dexterity', min: 1, max: 20, default: 10, description: 'Agility, reflexes, and hand-eye coordination for ranged attacks and stealth' },
        { name: 'CON', label: 'Constitution', min: 1, max: 20, default: 10, description: 'Health, stamina, and resistance to disease and environmental effects' },
        { name: 'INT', label: 'Intelligence', min: 1, max: 20, default: 10, description: 'Reasoning ability, memory, and analytical thinking' },
        { name: 'WIS', label: 'Wisdom', min: 1, max: 20, default: 10, description: 'Awareness, insight, and intuitive understanding' },
        { name: 'CHA', label: 'Charisma', min: 1, max: 20, default: 10, description: 'Force of personality, leadership, and social influence' }
      ]
    },
    {
      name: 'Modern RPG',
      label: 'Modern/Contemporary Setting',
      type: 'custom',
      attributes: [
        { name: 'BODY', label: 'Body', min: 1, max: 10, default: 5, description: 'Physical strength, health, and athletic capability' },
        { name: 'MIND', label: 'Mind', min: 1, max: 10, default: 5, description: 'Intelligence, reasoning, and problem-solving ability' },
        { name: 'SOUL', label: 'Soul', min: 1, max: 10, default: 5, description: 'Willpower, spirit, and emotional resilience' },
        { name: 'TECH', label: 'Technology', min: 1, max: 10, default: 5, description: 'Technical expertise, hacking, and digital literacy' }
      ]
    },
    {
      name: 'Simple System',
      label: 'Beginner-Friendly System',
      type: 'custom',
      attributes: [
        { name: 'MIGHT', label: 'Might', min: 1, max: 5, default: 3, description: 'Physical capabilities including strength and endurance' },
        { name: 'SPEED', label: 'Speed', min: 1, max: 5, default: 3, description: 'Agility, quickness, and reaction time' },
        { name: 'INTELLECT', label: 'Intellect', min: 1, max: 5, default: 3, description: 'Mental capabilities including reasoning and knowledge' }
      ]
    }
  ];

  constructor() {
    // Initialize forms with better defaults
    this.attributeForm = this.fb.group({
      attribute_name: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
      attribute_label: ['', [Validators.required, Validators.maxLength(100)]],
      calculation_type: ['static', [Validators.required]],
      base_value: [10, [Validators.required, Validators.min(1)]],
      min_value: [1, [Validators.required, Validators.min(0)]],
      max_value: [20, [Validators.required, Validators.min(1)]],
      display_order: [0, [Validators.min(0)]],
      is_core_stat: [true],
      description: ['', [Validators.maxLength(500)]]
    });

    this.searchForm = this.fb.group({
      search: ['']
    });

    // Auto-show templates when no attributes exist
    this.setupAutoTemplateDisplay();
  }

  ngOnInit() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) {
      this.snackBar.open('No game space selected', 'Dismiss', { duration: 3000 });
      return;
    }

    this.loadAttributes();
  }

  private async loadAttributes() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) return;

    try {
      await this.contentService.loadDynamicAttributes(gameSpace.id);
    } catch (error) {
      console.error('Error loading attributes:', error);
      this.snackBar.open('Error loading attributes. Please refresh the page.', 'Dismiss', { 
        duration: 5000 
      });
    }
  }

  private setupAutoTemplateDisplay() {
    // Automatically show templates when no attributes exist for better UX
    const attributesEmpty = computed(() => this.dynamicAttributes().length === 0);
    if (attributesEmpty()) {
      this.showTemplatesSignal.set(true);
    }
  }

  // Template Management
  onSelectTemplate(template: AttributeTemplate) {
    this.selectedTemplateSignal.set(template);
  }

  clearSelectedTemplate() {
    this.selectedTemplateSignal.set(null);
  }

  async onApplyTemplate() {
    const template = this.selectedTemplate();
    const gameSpace = this.currentGameSpace();
    
    if (!template || !gameSpace) return;

    // Check if attributes with same names already exist
    const existingNames = this.dynamicAttributes().map(attr => attr.attribute_name);
    const conflictingNames = template.attributes.filter(attr => 
      existingNames.includes(attr.name)
    );

    if (conflictingNames.length > 0) {
      const proceed = confirm(
        `The following attributes already exist: ${conflictingNames.map(a => a.name).join(', ')}. Do you want to continue and skip duplicates?`
      );
      if (!proceed) return;
    }

    try {
      let successCount = 0;
      let skippedCount = 0;
      let failureCount = 0;

      for (const [index, attr] of template.attributes.entries()) {
        // Skip if already exists
        if (existingNames.includes(attr.name)) {
          skippedCount++;
          continue;
        }

        const request: CreateDynamicAttributeRequest = {
          attribute_name: attr.name,
          attribute_label: attr.label,
          calculation_type: 'static',
          base_value: attr.default,
          min_value: attr.min,
          max_value: attr.max,
          display_order: this.dynamicAttributes().length + index,
          is_core_stat: true,
          description: attr.description
        };

        const result = await this.contentService.createDynamicAttribute(gameSpace.id, request);
        if (result) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      this.selectedTemplateSignal.set(null);
      
      // Show appropriate success message
      if (failureCount === 0) {
        let message = `Applied ${template.label} template successfully!`;
        if (skippedCount > 0) {
          message += ` Created ${successCount} new attributes, skipped ${skippedCount} existing ones.`;
        } else {
          message += ` Created ${successCount} attributes.`;
        }
        this.snackBar.open(message, 'Dismiss', { duration: 4000 });
      } else {
        this.snackBar.open(
          `Template applied with ${successCount} successes, ${skippedCount} skipped, and ${failureCount} failures.`, 
          'Dismiss', 
          { duration: 5000 }
        );
      }

      // Hide templates section after successful application
      if (successCount > 0) {
        this.showTemplatesSignal.set(false);
      }
    } catch (error) {
      console.error('Error applying template:', error);
      this.snackBar.open('Error applying template. Please try again.', 'Dismiss', { duration: 3000 });
    }
  }

  toggleTemplates() {
    this.showTemplatesSignal.set(!this.showTemplates());
    // Clear selection when closing
    if (!this.showTemplates()) {
      this.selectedTemplateSignal.set(null);
    }
  }

  // Attribute CRUD Operations
  async onCreateAttribute() {
    if (this.attributeForm.invalid) {
      this.markFormGroupTouched(this.attributeForm);
      this.snackBar.open('Please fill in all required fields correctly', 'Dismiss', { duration: 3000 });
      return;
    }

    const gameSpace = this.currentGameSpace();
    if (!gameSpace) {
      this.snackBar.open('No game space selected', 'Dismiss', { duration: 3000 });
      return;
    }

    const formValue = this.attributeForm.value;
    
    // Check for duplicate attribute names
    const existingNames = this.dynamicAttributes().map(attr => attr.attribute_name.toLowerCase());
    if (existingNames.includes(formValue.attribute_name.toLowerCase())) {
      this.snackBar.open('An attribute with this name already exists', 'Dismiss', { duration: 3000 });
      return;
    }

    const request: CreateDynamicAttributeRequest = {
      attribute_name: formValue.attribute_name.toUpperCase(),
      attribute_label: formValue.attribute_label,
      calculation_type: formValue.calculation_type,
      base_value: formValue.base_value,
      min_value: formValue.min_value,
      max_value: formValue.max_value,
      display_order: formValue.display_order || this.dynamicAttributes().length,
      is_core_stat: formValue.is_core_stat,
      description: formValue.description
    };

    try {
      const result = await this.contentService.createDynamicAttribute(gameSpace.id, request);
      if (result) {
        this.resetForm();
        this.snackBar.open(`Attribute "${result.attribute_label}" created successfully!`, 'Dismiss', { duration: 3000 });
        
        // Hide templates section after creating first attribute
        if (this.dynamicAttributes().length === 1) {
          this.showTemplatesSignal.set(false);
        }
      } else {
        this.snackBar.open('Error creating attribute. Please try again.', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error creating attribute:', error);
      this.snackBar.open('Error creating attribute. Please check your connection and try again.', 'Dismiss', { 
        duration: 4000 
      });
    }
  }

  onEditAttribute(attribute: DynamicAttribute) {
    this.editingAttributeSignal.set(attribute);
    this.attributeForm.patchValue({
      attribute_name: attribute.attribute_name,
      attribute_label: attribute.attribute_label,
      calculation_type: attribute.calculation_type,
      base_value: attribute.base_value,
      min_value: attribute.min_value,
      max_value: attribute.max_value,
      display_order: attribute.display_order,
      is_core_stat: attribute.is_core_stat,
      description: attribute.description
    });

    // Scroll form into view on mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        const formElement = document.querySelector('.form-section');
        formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  async onUpdateAttribute() {
    const editing = this.editingAttribute();
    if (!editing || this.attributeForm.invalid) {
      this.markFormGroupTouched(this.attributeForm);
      return;
    }

    const formValue = this.attributeForm.value;
    
    // Check for duplicate names (excluding current attribute)
    const existingNames = this.dynamicAttributes()
      .filter(attr => attr.id !== editing.id)
      .map(attr => attr.attribute_name.toLowerCase());
    
    if (existingNames.includes(formValue.attribute_name.toLowerCase())) {
      this.snackBar.open('An attribute with this name already exists', 'Dismiss', { duration: 3000 });
      return;
    }

    const updates = {
      attribute_name: formValue.attribute_name.toUpperCase(),
      attribute_label: formValue.attribute_label,
      calculation_type: formValue.calculation_type,
      base_value: formValue.base_value,
      min_value: formValue.min_value,
      max_value: formValue.max_value,
      display_order: formValue.display_order,
      is_core_stat: formValue.is_core_stat,
      description: formValue.description
    };

    try {
      const result = await this.contentService.updateDynamicAttribute(editing.id, updates);
      if (result) {
        this.cancelEdit();
        this.snackBar.open(`Attribute "${result.attribute_label}" updated successfully!`, 'Dismiss', { duration: 3000 });
      } else {
        this.snackBar.open('Error updating attribute. Please try again.', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error updating attribute:', error);
      this.snackBar.open('Error updating attribute. Please check your connection and try again.', 'Dismiss', { 
        duration: 4000 
      });
    }
  }

  async onDeleteAttribute(attribute: DynamicAttribute) {
    const confirmMessage = `Are you sure you want to delete "${attribute.attribute_label}"?\n\nThis will affect all characters using this attribute and cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      const gameSpace = this.currentGameSpace();
      if (!gameSpace) return;

      try {
        const success = await this.contentService.deleteDynamicAttribute(attribute.id, gameSpace.id);
        if (success) {
          this.snackBar.open(`Attribute "${attribute.attribute_label}" deleted successfully!`, 'Dismiss', { duration: 3000 });
          
          // Show templates section if no attributes remain
          if (this.dynamicAttributes().length === 0) {
            this.showTemplatesSignal.set(true);
          }
        } else {
          this.snackBar.open('Error deleting attribute. Please try again.', 'Dismiss', { duration: 3000 });
        }
      } catch (error) {
        console.error('Error deleting attribute:', error);
        this.snackBar.open('Error deleting attribute. Please check your connection and try again.', 'Dismiss', { 
          duration: 4000 
        });
      }
    }
  }

  cancelEdit() {
    this.editingAttributeSignal.set(null);
    this.resetForm();
  }

  private resetForm() {
    this.attributeForm.reset({
      calculation_type: 'static',
      base_value: 10,
      min_value: 1,
      max_value: 20,
      display_order: this.dynamicAttributes().length,
      is_core_stat: true
    });
  }

  // Drag and Drop for reordering
  onDrop(event: CdkDragDrop<DynamicAttribute[]>) {
    const attributes = [...this.dynamicAttributes()];
    moveItemInArray(attributes, event.previousIndex, event.currentIndex);
    
    // Update display_order for all affected attributes
    const updates = attributes.map((attr, index) => ({
      id: attr.id,
      newOrder: index
    })).filter(item => {
      const originalAttr = this.dynamicAttributes().find(a => a.id === item.id);
      return originalAttr && originalAttr.display_order !== item.newOrder;
    });

    // Batch update display orders
    updates.forEach(async (update) => {
      await this.contentService.updateDynamicAttribute(update.id, { display_order: update.newOrder });
    });

    if (updates.length > 0) {
      this.snackBar.open('Attribute order updated', 'Dismiss', { duration: 2000 });
    }
  }

  // Utility methods
  getAttributeTypeIcon(type: string): string {
    switch (type) {
      case 'calculated': return 'calculate';
      case 'static': return 'tune';
      case 'dice_based': return 'casino';
      default: return 'help_outline';
    }
  }

  getAttributeTypeLabel(type: string): string {
    switch (type) {
      case 'calculated': return 'Calculated';
      case 'static': return 'Static';
      case 'dice_based': return 'Dice-based';
      default: return 'Unknown';
    }
  }

  // Validation helpers
  getAttributeNameError(): string {
    const control = this.attributeForm.get('attribute_name');
    if (control?.hasError('required')) return 'Attribute name is required';
    if (control?.hasError('pattern')) return 'Use only uppercase letters and underscores (e.g., STR, CUSTOM_STAT)';
    return '';
  }

  getMinMaxError(): string {
    const min = this.attributeForm.get('min_value')?.value;
    const max = this.attributeForm.get('max_value')?.value;
    const defaultVal = this.attributeForm.get('base_value')?.value;
    
    if (min !== null && max !== null) {
      if (min >= max) return 'Maximum must be greater than minimum';
      if (defaultVal !== null && (defaultVal < min || defaultVal > max)) {
        return 'Default value must be between minimum and maximum';
      }
    }
    return '';
  }

  isFormValid(): boolean {
    return this.attributeForm.valid && !this.getMinMaxError();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}