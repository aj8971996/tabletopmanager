// content-manager.ts - Fixed TypeScript errors
import { Component, inject, OnInit, ChangeDetectionStrategy, computed, signal } from '@angular/core';
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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { GameSpaceService } from '../game-space';
import { ContentService } from '../../../core/services/content';
import { TextSection, CreateTextSectionRequest } from '../../../shared/models';

interface ContentCategory {
  type: 'rules' | 'lore' | 'general' | 'custom';
  label: string;
  icon: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-content-manager',
  templateUrl: './content-manager.html',
  styleUrls: ['./content-manager.scss'],
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
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatCheckboxModule,
    DragDropModule
  ]
})
export class ContentManagerComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private contentService = inject(ContentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  // Service signals
  currentGameSpace = this.gameSpaceService.currentGameSpace;
  textSections = this.contentService.textSections;
  isLoading = this.contentService.isLoading;

  // Local signals - FIXED: Made searchTermSignal public
  private selectedCategorySignal = signal<string>('all');
  private editingItemSignal = signal<TextSection | null>(null);
  private uploadingSignal = signal(false);
  searchTermSignal = signal(''); // Made public so template can access

  // Public computed signals
  selectedCategory = computed(() => this.selectedCategorySignal());
  editingItem = computed(() => this.editingItemSignal());
  isUploading = computed(() => this.uploadingSignal());
  searchTerm = computed(() => this.searchTermSignal());

  // Content categories configuration
  contentCategories: ContentCategory[] = [
    {
      type: 'rules',
      label: 'Rules & Mechanics',
      icon: 'gavel',
      description: 'Game rules, mechanics, and system information',
      color: 'primary'
    },
    {
      type: 'lore',
      label: 'Lore & Worldbuilding',
      icon: 'public',
      description: 'World history, locations, cultures, and background',
      color: 'accent'
    },
    {
      type: 'general',
      label: 'General Information',
      icon: 'info',
      description: 'General game information and reference materials',
      color: 'warn'
    },
    {
      type: 'custom',
      label: 'Custom Content',
      icon: 'edit_note',
      description: 'Custom sections and miscellaneous content',
      color: 'primary'
    }
  ];

  // Forms
  contentForm: FormGroup;
  uploadForm: FormGroup;

  // Computed filtered content
  filteredContent = computed(() => {
    const sections = this.textSections();
    const category = this.selectedCategorySignal();
    const searchTerm = this.searchTermSignal().toLowerCase();

    let filtered = sections;

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(section => section.section_type === category);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(section =>
        section.title.toLowerCase().includes(searchTerm) ||
        (section.content && section.content.toLowerCase().includes(searchTerm))
      );
    }

    // Sort by order_index, then by title
    return filtered.sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return a.title.localeCompare(b.title);
    });
  });

  // Computed content statistics
  contentStats = computed(() => {
    const sections = this.textSections();
    return {
      total: sections.length,
      rules: sections.filter(s => s.section_type === 'rules').length,
      lore: sections.filter(s => s.section_type === 'lore').length,
      general: sections.filter(s => s.section_type === 'general').length,
      custom: sections.filter(s => s.section_type === 'custom').length,
      public: sections.filter(s => s.is_public).length,
      private: sections.filter(s => !s.is_public).length
    };
  });

  constructor() {
    this.contentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      section_type: ['general', Validators.required],
      content: [''],
      is_public: [true],
      order_index: [0]
    });

    this.uploadForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      section_type: ['general', Validators.required],
      is_public: [true],
      file: [null, Validators.required]
    });
  }

  ngOnInit() {
    if (!this.currentGameSpace()) {
      return;
    }

    this.loadContent();
  }

  private async loadContent() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) return;

    try {
      await this.contentService.loadTextSections(gameSpace.id);
    } catch (error) {
      console.error('Error loading content:', error);
      this.snackBar.open('Error loading content', 'Dismiss', { duration: 3000 });
    }
  }

  // FIXED: Handle MatChipSelectionChange event properly
  onCategorySelect(event: any) {
    const selectedValue = event.value;
    if (selectedValue) {
      this.selectedCategorySignal.set(selectedValue);
    }
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTermSignal.set(target.value);
  }

  onCreateNew() {
    this.editingItemSignal.set(null);
    this.contentForm.reset({
      section_type: this.selectedCategory() !== 'all' ? this.selectedCategory() : 'general',
      is_public: true,
      order_index: this.getNextOrderIndex()
    });
  }

  onEditItem(item: TextSection) {
    this.editingItemSignal.set(item);
    this.contentForm.patchValue({
      title: item.title,
      section_type: item.section_type,
      content: item.content || '',
      is_public: item.is_public,
      order_index: item.order_index
    });
  }

  onCancelEdit() {
    this.editingItemSignal.set(null);
    this.contentForm.reset();
  }

  async onSaveContent() {
    if (!this.contentForm.valid || !this.currentGameSpace()) {
      return;
    }

    const formValue = this.contentForm.value;
    const gameSpaceId = this.currentGameSpace()!.id;
    const editingItem = this.editingItem();

    try {
      if (editingItem) {
        // Update existing content
        const updated = await this.contentService.updateTextSection(editingItem.id, formValue);
        if (updated) {
          this.snackBar.open('Content updated successfully', 'Dismiss', { duration: 3000 });
          this.onCancelEdit();
        } else {
          this.snackBar.open('Error updating content', 'Dismiss', { duration: 3000 });
        }
      } else {
        // Create new content
        const request: CreateTextSectionRequest = formValue;
        const created = await this.contentService.createTextSection(gameSpaceId, request);
        if (created) {
          this.snackBar.open('Content created successfully', 'Dismiss', { duration: 3000 });
          this.onCancelEdit();
        } else {
          this.snackBar.open('Error creating content', 'Dismiss', { duration: 3000 });
        }
      }
    } catch (error) {
      console.error('Error saving content:', error);
      this.snackBar.open('Error saving content', 'Dismiss', { duration: 3000 });
    }
  }

  async onDeleteItem(item: TextSection) {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    const gameSpaceId = this.currentGameSpace()?.id;
    if (!gameSpaceId) return;

    try {
      const success = await this.contentService.deleteTextSection(item.id, gameSpaceId);
      if (success) {
        this.snackBar.open('Content deleted successfully', 'Dismiss', { duration: 3000 });
        // Clear editing if we deleted the item being edited
        if (this.editingItem()?.id === item.id) {
          this.onCancelEdit();
        }
      } else {
        this.snackBar.open('Error deleting content', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      this.snackBar.open('Error deleting content', 'Dismiss', { duration: 3000 });
    }
  }

  onFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      this.uploadForm.patchValue({ file: null });
      return;
    }

    // Validate file type (text files only)
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      this.snackBar.open('Only text files (.txt, .md) are supported', 'Dismiss', { duration: 4000 });
      target.value = '';
      this.uploadForm.patchValue({ file: null });
      return;
    }

    // Set filename as default title if not provided
    if (!this.uploadForm.get('title')?.value) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      this.uploadForm.patchValue({ title: nameWithoutExtension });
    }

    this.uploadForm.patchValue({ file });
  }

  async onUploadFile() {
    if (!this.uploadForm.valid || !this.currentGameSpace()) {
      return;
    }

    const formValue = this.uploadForm.value;
    const file = formValue.file as File;
    const gameSpaceId = this.currentGameSpace()!.id;

    this.uploadingSignal.set(true);

    try {
      // Read file content
      const content = await this.readFileContent(file);
      
      // Create text section with file content
      const request: CreateTextSectionRequest = {
        title: formValue.title,
        section_type: formValue.section_type,
        content: content,
        is_public: formValue.is_public,
        order_index: this.getNextOrderIndex()
      };

      const created = await this.contentService.createTextSection(gameSpaceId, request);
      if (created) {
        this.snackBar.open(`File "${file.name}" uploaded successfully`, 'Dismiss', { duration: 3000 });
        this.uploadForm.reset({ section_type: 'general', is_public: true });
        // Clear file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        this.snackBar.open('Error uploading file', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      this.snackBar.open('Error reading or uploading file', 'Dismiss', { duration: 3000 });
    } finally {
      this.uploadingSignal.set(false);
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

  onDrop(event: CdkDragDrop<TextSection[]>) {
    const sections = [...this.filteredContent()];
    moveItemInArray(sections, event.previousIndex, event.currentIndex);
    
    // Update order_index for reordered items
    this.updateSectionOrder(sections);
  }

  private async updateSectionOrder(sections: TextSection[]) {
    const updates = sections.map((section, index) => ({
      id: section.id,
      order_index: index
    }));

    try {
      for (const update of updates) {
        await this.contentService.updateTextSection(update.id, { order_index: update.order_index });
      }
      this.snackBar.open('Content order updated', 'Dismiss', { duration: 2000 });
    } catch (error) {
      console.error('Error updating content order:', error);
      this.snackBar.open('Error updating content order', 'Dismiss', { duration: 3000 });
    }
  }

  private getNextOrderIndex(): number {
    const sections = this.textSections();
    if (sections.length === 0) return 0;
    return Math.max(...sections.map(s => s.order_index)) + 1;
  }

  getCategoryInfo(type: string): ContentCategory | undefined {
    return this.contentCategories.find(cat => cat.type === type);
  }

  // Handle undefined content properly
  getContentPreview(content: string | null | undefined): string {
    if (!content) return 'No content';
    const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Public method to clear search term (for template access)
  clearSearch() {
    this.searchTermSignal.set('');
  }
}