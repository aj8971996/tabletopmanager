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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { GameSpaceService } from '../game-space';
import { ContentService } from '../../../core/services/content';
import { DynamicAttribute, CreateDynamicAttributeRequest } from '../../../shared/models';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

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
    MatTableModule,
    MatSortModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDividerModule,
    MatMenuModule,
    DragDropModule,
    MatProgressSpinnerModule
]
})
export class AttributeManagerComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private contentService = inject(ContentService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Computed from services
  currentGameSpace = computed(() => this.gameSpaceService.currentGameSpace());
  dynamicAttributes = computed(() => this.contentService.dynamicAttributes());
  coreAttributes = computed(() => this.contentService.coreAttributes());
  isLoading = computed(() => this.contentService.isLoading());

  // Local signals
  private editingAttributeSignal = signal<DynamicAttribute | null>(null);
  private showTemplatesSignal = signal(false);
  private selectedTemplateSignal = signal<AttributeTemplate | null>(null);

  // Computed for local state
  editingAttribute = computed(() => this.editingAttributeSignal());
  showTemplates = computed(() => this.showTemplatesSignal());
  selectedTemplate = computed(() => this.selectedTemplateSignal());

  // Public methods for template access
  clearSelectedTemplate() {
    this.selectedTemplateSignal.set(null);
  }

  // Forms
  attributeForm: FormGroup;
  searchForm: FormGroup;

  // Display columns for attribute table
  displayedColumns: string[] = ['drag', 'name', 'type', 'range', 'default', 'core', 'actions'];

  // Attribute templates for quick setup
  attributeTemplates: AttributeTemplate[] = [
    {
      name: 'D&D 5e Standard',
      label: 'Dungeons & Dragons 5th Edition',
      type: 'physical',
      attributes: [
        { name: 'STR', label: 'Strength', min: 1, max: 20, default: 10, description: 'Physical power and muscle' },
        { name: 'DEX', label: 'Dexterity', min: 1, max: 20, default: 10, description: 'Agility and reflexes' },
        { name: 'CON', label: 'Constitution', min: 1, max: 20, default: 10, description: 'Health and stamina' },
        { name: 'INT', label: 'Intelligence', min: 1, max: 20, default: 10, description: 'Reasoning and memory' },
        { name: 'WIS', label: 'Wisdom', min: 1, max: 20, default: 10, description: 'Awareness and insight' },
        { name: 'CHA', label: 'Charisma', min: 1, max: 20, default: 10, description: 'Force of personality' }
      ]
    },
    {
      name: 'Modern RPG',
      label: 'Modern/Contemporary Setting',
      type: 'custom',
      attributes: [
        { name: 'BODY', label: 'Body', min: 1, max: 10, default: 5, description: 'Physical strength and health' },
        { name: 'MIND', label: 'Mind', min: 1, max: 10, default: 5, description: 'Intelligence and reasoning' },
        { name: 'SOUL', label: 'Soul', min: 1, max: 10, default: 5, description: 'Willpower and spirit' },
        { name: 'TECH', label: 'Technology', min: 1, max: 10, default: 5, description: 'Tech savvy and hacking' }
      ]
    },
    {
      name: 'Simple System',
      label: 'Beginner-Friendly System',
      type: 'custom',
      attributes: [
        { name: 'MIGHT', label: 'Might', min: 1, max: 5, default: 3, description: 'Physical capabilities' },
        { name: 'SPEED', label: 'Speed', min: 1, max: 5, default: 3, description: 'Agility and quickness' },
        { name: 'INTELLECT', label: 'Intellect', min: 1, max: 5, default: 3, description: 'Mental capabilities' }
      ]
    }
  ];

  constructor() {
    // Initialize forms
    this.attributeForm = this.fb.group({
      attribute_name: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
      attribute_label: ['', [Validators.required]],
      calculation_type: ['static', [Validators.required]],
      base_value: [10, [Validators.required, Validators.min(1)]],
      min_value: [1, [Validators.required, Validators.min(0)]],
      max_value: [20, [Validators.required, Validators.min(1)]],
      display_order: [0, [Validators.min(0)]],
      is_core_stat: [true],
      description: ['']
    });

    this.searchForm = this.fb.group({
      search: [''],
      filterType: ['all']
    });
  }

  ngOnInit() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) {
      this.snackBar.open('No game space selected', 'Dismiss', { duration: 3000 });
      return;
    }

    // Load existing attributes
    this.contentService.loadDynamicAttributes(gameSpace.id);
  }

  // Template Management
  onSelectTemplate(template: AttributeTemplate) {
    this.selectedTemplateSignal.set(template);
    this.showTemplatesSignal.set(false);
  }

  async onApplyTemplate() {
    const template = this.selectedTemplate();
    const gameSpace = this.currentGameSpace();
    
    if (!template || !gameSpace) return;

    try {
      for (const [index, attr] of template.attributes.entries()) {
        const request: CreateDynamicAttributeRequest = {
          attribute_name: attr.name,
          attribute_label: attr.label,
          calculation_type: 'static',
          base_value: attr.default,
          min_value: attr.min,
          max_value: attr.max,
          display_order: index,
          is_core_stat: true,
          description: attr.description
        };

        await this.contentService.createDynamicAttribute(gameSpace.id, request);
      }

      this.selectedTemplateSignal.set(null);
      this.snackBar.open(`Applied ${template.label} template successfully!`, 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error applying template', 'Dismiss', { duration: 3000 });
    }
  }

  // Attribute CRUD Operations
  onCreateAttribute() {
    if (this.attributeForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Dismiss', { duration: 3000 });
      return;
    }

    const gameSpace = this.currentGameSpace();
    if (!gameSpace) return;

    const formValue = this.attributeForm.value;
    const request: CreateDynamicAttributeRequest = {
      attribute_name: formValue.attribute_name,
      attribute_label: formValue.attribute_label,
      calculation_type: formValue.calculation_type,
      base_value: formValue.base_value,
      min_value: formValue.min_value,
      max_value: formValue.max_value,
      display_order: formValue.display_order,
      is_core_stat: formValue.is_core_stat,
      description: formValue.description
    };

    this.contentService.createDynamicAttribute(gameSpace.id, request).then(result => {
      if (result) {
        this.attributeForm.reset({
          calculation_type: 'static',
          base_value: 10,
          min_value: 1,
          max_value: 20,
          display_order: 0,
          is_core_stat: true
        });
        this.snackBar.open('Attribute created successfully!', 'Dismiss', { duration: 3000 });
      } else {
        this.snackBar.open('Error creating attribute', 'Dismiss', { duration: 3000 });
      }
    });
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
  }

  onUpdateAttribute() {
    const editing = this.editingAttribute();
    if (!editing || this.attributeForm.invalid) return;

    const formValue = this.attributeForm.value;
    const updates = {
      attribute_name: formValue.attribute_name,
      attribute_label: formValue.attribute_label,
      calculation_type: formValue.calculation_type,
      base_value: formValue.base_value,
      min_value: formValue.min_value,
      max_value: formValue.max_value,
      display_order: formValue.display_order,
      is_core_stat: formValue.is_core_stat,
      description: formValue.description
    };

    this.contentService.updateDynamicAttribute(editing.id, updates).then(result => {
      if (result) {
        this.cancelEdit();
        this.snackBar.open('Attribute updated successfully!', 'Dismiss', { duration: 3000 });
      } else {
        this.snackBar.open('Error updating attribute', 'Dismiss', { duration: 3000 });
      }
    });
  }

  onDeleteAttribute(attribute: DynamicAttribute) {
    if (confirm(`Are you sure you want to delete "${attribute.attribute_label}"? This will affect all characters using this attribute.`)) {
      const gameSpace = this.currentGameSpace();
      if (!gameSpace) return;

      this.contentService.deleteDynamicAttribute(attribute.id, gameSpace.id).then(success => {
        if (success) {
          this.snackBar.open('Attribute deleted successfully!', 'Dismiss', { duration: 3000 });
        } else {
          this.snackBar.open('Error deleting attribute', 'Dismiss', { duration: 3000 });
        }
      });
    }
  }

  cancelEdit() {
    this.editingAttributeSignal.set(null);
    this.attributeForm.reset({
      calculation_type: 'static',
      base_value: 10,
      min_value: 1,
      max_value: 20,
      display_order: 0,
      is_core_stat: true
    });
  }

  // Drag and Drop for reordering
  onDrop(event: CdkDragDrop<DynamicAttribute[]>) {
    const attributes = [...this.dynamicAttributes()];
    moveItemInArray(attributes, event.previousIndex, event.currentIndex);
    
    // Update display_order for all moved attributes
    attributes.forEach((attr, index) => {
      if (attr.display_order !== index) {
        this.contentService.updateDynamicAttribute(attr.id, { display_order: index });
      }
    });
  }

  // Utility methods
  getAttributeTypeIcon(type: string): string {
    switch (type) {
      case 'calculated': return 'calculate';
      case 'static': return 'tune';
      default: return 'help_outline';
    }
  }

  getAttributeTypeLabel(type: string): string {
    switch (type) {
      case 'calculated': return 'Calculated';
      case 'static': return 'Static';
      default: return 'Unknown';
    }
  }

  toggleTemplates() {
    this.showTemplatesSignal.set(!this.showTemplates());
  }

  // Validation helpers
  getAttributeNameError(): string {
    const control = this.attributeForm.get('attribute_name');
    if (control?.hasError('required')) return 'Attribute name is required';
    if (control?.hasError('pattern')) return 'Use only uppercase letters and underscores';
    return '';
  }

  getMinMaxError(): string {
    const min = this.attributeForm.get('min_value')?.value;
    const max = this.attributeForm.get('max_value')?.value;
    if (min >= max) return 'Maximum must be greater than minimum';
    return '';
  }

  isFormValid(): boolean {
    return this.attributeForm.valid && !this.getMinMaxError();
  }
}