import { Component, inject, OnInit, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { SupabaseService } from '../../../core/services/supabase';
import { GameSpaceService } from '../game-space';
import { GameSpace } from '../../../shared/models/game-space.model';
import { GameSpaceCreationDialogComponent } from '../game-space-creation-dialog/game-space-creation-dialog';

interface PublicGameSpace {
  id: string;
  name: string;
  description: string;
  gm_name: string;
  system_type: string;
  member_count: number;
  activity_level: string;
  is_featured?: boolean;
  is_public: boolean;
  tags: string[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDialogModule,
    MatSnackBarModule
  ]
})
export class DashboardComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private gameSpaceService = inject(GameSpaceService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Service signals
  currentUser = this.supabaseService.currentUser$;
  gameSpaces = this.gameSpaceService.gameSpaces;
  isLoading = this.gameSpaceService.isLoading;
  error = this.gameSpaceService.error;

  // Local signals for UI state
  private selectedTabIndexSignal = signal(0);
  private isBrowseLoadingSignal = signal(false);
  private browseErrorSignal = signal<string | null>(null);
  private publicSpacesSignal = signal<PublicGameSpace[]>([]);
  private featuredSpacesSignal = signal<PublicGameSpace[]>([]);

  // Computed from signals
  selectedTabIndex = computed(() => this.selectedTabIndexSignal());
  isBrowseLoading = computed(() => this.isBrowseLoadingSignal());
  browseError = computed(() => this.browseErrorSignal());
  publicSpaces = computed(() => this.publicSpacesSignal());
  featuredSpaces = computed(() => this.featuredSpacesSignal());

  // Form controls
  searchControl = new FormControl('');

  constructor() {
    // Setup search functionality
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.onSearchChange(searchTerm || '');
      });
  }

  ngOnInit() {
    this.gameSpaceService.loadUserGameSpaces();
    this.loadMockPublicSpaces();
  }

  onTabChange(index: number) {
    this.selectedTabIndexSignal.set(index);
    
    // Load browse content when switching to browse tab
    if (index === 1 && this.publicSpaces().length === 0) {
      this.loadPublicSpaces();
    }
  }

  onSwitchToBrowse() {
    this.selectedTabIndexSignal.set(1);
    if (this.publicSpaces().length === 0) {
      this.loadPublicSpaces();
    }
  }

  async onSignOut() {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }

  onRetryLoad() {
    this.gameSpaceService.loadUserGameSpaces();
  }

  onCreateGameSpace() {
    const dialogRef = this.dialog.open(GameSpaceCreationDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      panelClass: 'game-space-creation-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success && result.gameSpace) {
        // Success - show main success message
        this.snackBar.open(
          `Game Space "${result.gameSpace.name}" created successfully!`,
          'View',
          { 
            duration: 5000,
            panelClass: 'success-snackbar'
          }
        ).onAction().subscribe(() => {
          this.onSelectGameSpace(result.gameSpace);
        });

        // Show additional info about what was created
        setTimeout(() => {
          let additionalMessage = '';
          
          if (result.template && result.template.id !== 'custom') {
            const parts = [];
            
            if (result.attributesCreated > 0) {
              parts.push(`${result.attributesCreated} attributes`);
            }
            
            if (result.template.defaultOptions?.length > 0) {
              parts.push(`${result.template.defaultOptions.length} settings`);
            }
            
            if (parts.length > 0) {
              additionalMessage = `Applied ${result.template.name} template with ${parts.join(' and ')}`;
            }
          } else {
            additionalMessage = 'Custom game space ready for configuration';
          }
          
          if (additionalMessage) {
            this.snackBar.open(
              additionalMessage,
              'Configure',
              { 
                duration: 7000,
                panelClass: 'info-snackbar'
              }
            ).onAction().subscribe(() => {
              this.onManageGameSpace(result.gameSpace);
            });
          }
        }, 1000);
        
      } else if (!result?.success) {
        // Error occurred
        const errorMessage = result?.error || 'Failed to create game space';
        this.snackBar.open(
          `Error: ${errorMessage}`,
          'Close',
          { 
            duration: 8000,
            panelClass: 'error-snackbar'
          }
        );
      }
      // If result is undefined/null, user just cancelled - no action needed
    });
  }

  onSelectGameSpace(gameSpace: GameSpace) {
    this.gameSpaceService.setCurrentGameSpace(gameSpace);
    
    this.snackBar.open(
      `Switched to "${gameSpace.name}"`,
      'Close',
      { 
        duration: 3000,
        panelClass: 'info-snackbar'
      }
    );

    // TODO: Navigate to game space dashboard/management view
    console.log('Selected game space:', gameSpace);
  }

  onManageGameSpace(gameSpace: GameSpace) {
    this.gameSpaceService.setCurrentGameSpace(gameSpace);
    this.router.navigate(['/admin/overview']); // Navigate to admin panel
    
    this.snackBar.open(
      `Opening admin panel for "${gameSpace.name}"`,
      'Close',
      { duration: 3000, panelClass: 'info-snackbar' }
    );
  }

  onInvitePlayers(gameSpace: GameSpace) {
    // TODO: Open player invitation dialog
    console.log('Invite players to:', gameSpace);
    
    this.snackBar.open(
      'Player invitation feature coming soon!',
      'Close',
      { 
        duration: 3000,
        panelClass: 'info-snackbar'
      }
    );
  }

  onDeleteGameSpace(gameSpace: GameSpace) {
    // TODO: Open confirmation dialog before deletion
    const confirmDelete = confirm(`Are you sure you want to delete "${gameSpace.name}"? This action cannot be undone.`);
    
    if (confirmDelete) {
      this.gameSpaceService.deleteGameSpace(gameSpace.id).then(success => {
        if (success) {
          this.snackBar.open(
            `Game Space "${gameSpace.name}" deleted successfully`,
            'Close',
            { 
              duration: 4000,
              panelClass: 'success-snackbar'
            }
          );
        } else {
          this.snackBar.open(
            'Failed to delete game space. Please try again.',
            'Close',
            { 
              duration: 4000,
              panelClass: 'error-snackbar'
            }
          );
        }
      });
    }
  }

  // Public spaces functionality
  async loadPublicSpaces() {
    this.isBrowseLoadingSignal.set(true);
    this.browseErrorSignal.set(null);

    try {
      // TODO: Replace with actual API call
      await this.simulateNetworkDelay(1500);
      
      // For now, use mock data
      this.loadMockPublicSpaces();
      
    } catch (error) {
      console.error('Error loading public spaces:', error);
      this.browseErrorSignal.set('Failed to load public game spaces. Please try again.');
    } finally {
      this.isBrowseLoadingSignal.set(false);
    }
  }

  private loadMockPublicSpaces() {
    // Mock featured spaces
    const featuredSpaces: PublicGameSpace[] = [
      {
        id: 'featured-1',
        name: 'The Lost Mines of Phandelver',
        description: 'A classic D&D 5e adventure perfect for new players. Explore dungeons, fight goblins, and uncover ancient mysteries in this beginner-friendly campaign.',
        gm_name: 'DungeonMaster_Dave',
        system_type: 'D&D 5th Edition',
        member_count: 5,
        activity_level: 'Weekly',
        is_featured: true,
        is_public: true,
        tags: ['beginner-friendly', 'classic', 'dungeon-crawl']
      },
      {
        id: 'featured-2',
        name: 'Cyberpunk 2077: Night City Tales',
        description: 'High-tech, low-life adventures in Night City. Corporate espionage, street gangs, and cybernetic enhancements await in this futuristic setting.',
        gm_name: 'NetrunnerGM',
        system_type: 'Cyberpunk RED',
        member_count: 4,
        activity_level: 'Bi-weekly',
        is_featured: true,
        is_public: true,
        tags: ['cyberpunk', 'futuristic', 'mature-themes']
      }
    ];

    // Mock public spaces
    const publicSpaces: PublicGameSpace[] = [
      {
        id: 'public-1',
        name: 'Curse of Strahd: Barovia Chronicles',
        description: 'Gothic horror in the cursed lands of Barovia. Face vampires, werewolves, and dark magic.',
        gm_name: 'GothicGM',
        system_type: 'D&D 5th Edition',
        member_count: 6,
        activity_level: 'Weekly',
        is_public: true,
        tags: ['horror', 'gothic', 'roleplay-heavy']
      },
      {
        id: 'public-2',
        name: 'Star Wars: Edge of the Empire',
        description: 'Smugglers, rebels, and bounty hunters on the edge of civilized space.',
        gm_name: 'JediMaster_GM',
        system_type: 'Star Wars RPG',
        member_count: 4,
        activity_level: 'Monthly',
        is_public: true,
        tags: ['star-wars', 'space-opera', 'narrative']
      },
      {
        id: 'public-3',
        name: 'Call of Cthulhu: Miskatonic University',
        description: 'Investigate cosmic horrors and eldritch mysteries in 1920s New England.',
        gm_name: 'LovecraftFan',
        system_type: 'Call of Cthulhu',
        member_count: 3,
        activity_level: 'Bi-weekly',
        is_public: true,
        tags: ['horror', 'investigation', '1920s']
      },
      {
        id: 'public-4',
        name: 'Pathfinder: Rise of the Runelords',
        description: 'Epic fantasy adventure with complex character builds and tactical combat.',
        gm_name: 'PathfinderPro',
        system_type: 'Pathfinder 2e',
        member_count: 5,
        activity_level: 'Weekly',
        is_public: true,
        tags: ['fantasy', 'tactical', 'character-builds']
      }
    ];

    this.featuredSpacesSignal.set(featuredSpaces);
    this.publicSpacesSignal.set(publicSpaces);
  }

  private async simulateNetworkDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  onSearchChange(searchTerm: string) {
    // TODO: Implement actual search functionality
    console.log('Search term:', searchTerm);
    
    if (searchTerm.trim() === '') {
      this.loadMockPublicSpaces();
      return;
    }

    // For now, just filter mock data
    const allSpaces = [...this.featuredSpaces(), ...this.publicSpaces()];
    const filtered = allSpaces.filter(space => 
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.system_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    this.publicSpacesSignal.set(filtered);
  }

  onClearSearch() {
    this.searchControl.setValue('');
    this.loadMockPublicSpaces();
  }

  onViewPublicSpace(space: PublicGameSpace) {
    // TODO: Open public space details dialog/page
    console.log('View public space:', space);
    
    this.snackBar.open(
      `Opening details for "${space.name}"`,
      'Close',
      { 
        duration: 3000,
        panelClass: 'info-snackbar'
      }
    );
  }

  onRequestAccess(space: PublicGameSpace) {
    // TODO: Open request access dialog
    console.log('Request access to:', space);
    
    this.snackBar.open(
      `Access request sent for "${space.name}"`,
      'Close',
      { 
        duration: 4000,
        panelClass: 'success-snackbar'
      }
    );
  }

  getUserDisplayName(user: any): string {
    return user?.email?.split('@')[0] || 'User';
  }
}