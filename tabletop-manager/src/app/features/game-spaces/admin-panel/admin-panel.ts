// admin-panel.ts - Updated with progressive disclosure logic
import { Component, inject, OnInit, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GameSpaceService } from '../game-space';
import { ContentService } from '../../../core/services/content';
import { GameSpace } from '../../../shared/models';
import { AttributeManagerComponent } from '../attribute-manager/attribute-manager';
import { CharacterClassManagerComponent } from '../character-class-manager/character-class-manager';

interface AdminSection {
  id: string;
  label: string;
  icon: string;
  description: string;
  badge?: number;
  route: string;
  isAvailable?: boolean;
  requiresCompletion?: string[];
  lockedMessage?: string;
  setupStep?: number;
}

interface SetupProgress {
  hasAttributes: boolean;
  hasCharacterClasses: boolean;
  hasContent: boolean;
  hasMembers: boolean;
  totalSteps: number;
  completedSteps: number;
}

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.html',
  styleUrls: ['./admin-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    AttributeManagerComponent,
    CharacterClassManagerComponent
  ]
})
export class AdminPanelComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private contentService = inject(ContentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  // Service signals
  currentGameSpace = this.gameSpaceService.currentGameSpace;
  currentGameSpaceStats = this.gameSpaceService.currentGameSpaceStats;
  isLoading = this.gameSpaceService.isLoading;
  error = this.gameSpaceService.error;
  
  // Content service signals for setup progress
  dynamicAttributes = this.contentService.dynamicAttributes;
  characterClasses = this.contentService.characterClasses;
  textSections = this.contentService.textSections;
  
  private activeTabSignal = signal('overview');
  public activeTab = computed(() => this.activeTabSignal());

  // Computed setup progress
  public setupProgress = computed((): SetupProgress => {
    const hasAttributes = this.dynamicAttributes().length > 0;
    const hasCharacterClasses = this.characterClasses().length > 0;
    const hasContent = this.textSections().length > 0;
    const stats = this.currentGameSpaceStats();
    const hasMembers = stats ? stats.totalMembers > 1 : false;

    let completedSteps = 0;
    if (hasAttributes) completedSteps++;
    if (hasCharacterClasses) completedSteps++;
    if (hasContent) completedSteps++;
    if (hasMembers) completedSteps++;

    return {
      hasAttributes,
      hasCharacterClasses,
      hasContent,
      hasMembers,
      totalSteps: 4,
      completedSteps
    };
  });

  // Base admin sections with progressive disclosure logic
  private baseAdminSections: AdminSection[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'dashboard',
      description: 'Game space statistics and setup progress',
      route: 'overview',
      isAvailable: true,
      setupStep: 0
    },
    {
      id: 'attributes',
      label: 'Character Attributes',
      icon: 'tune',
      description: 'Define core character stats and values',
      route: 'attributes',
      isAvailable: true,
      setupStep: 1
    },
    {
      id: 'character-classes',
      label: 'Character Classes',
      icon: 'school',
      description: 'Create classes, races, and archetypes',
      route: 'character-classes',
      requiresCompletion: ['attributes'],
      lockedMessage: 'Create at least one attribute first',
      setupStep: 2
    },
    {
      id: 'characters',
      label: 'Characters',
      icon: 'groups',
      description: 'NPCs and player character management',
      route: 'characters',
      requiresCompletion: ['attributes'],
      lockedMessage: 'Define character attributes first',
      setupStep: 3
    },
    {
      id: 'content',
      label: 'Content Library',
      icon: 'library_books',
      description: 'Rules, lore, and world information',
      route: 'content',
      isAvailable: true,
      setupStep: 2
    },
    {
      id: 'trackers',
      label: 'Custom Trackers',
      icon: 'track_changes',
      description: 'Token and slide-based progress tracking',
      route: 'trackers',
      requiresCompletion: ['attributes'],
      lockedMessage: 'Set up character attributes first'
    },
    {
      id: 'members',
      label: 'Members',
      icon: 'people',
      description: 'Manage players and permissions',
      route: 'members',
      requiresCompletion: ['attributes', 'character-classes'],
      lockedMessage: 'Complete basic setup first (attributes & classes)'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      description: 'Advanced game space configuration',
      route: 'settings',
      requiresCompletion: ['attributes'],
      lockedMessage: 'Define core attributes first'
    }
  ];

  // Computed admin sections with availability logic
  public adminSections = computed((): AdminSection[] => {
    const progress = this.setupProgress();
    const stats = this.currentGameSpaceStats();
    
    return this.baseAdminSections.map(section => {
      let isAvailable = section.isAvailable || false;
      
      // Check if section requirements are met
      if (section.requiresCompletion) {
        const requirementsMet = section.requiresCompletion.every(requirement => {
          switch (requirement) {
            case 'attributes':
              return progress.hasAttributes;
            case 'character-classes':
              return progress.hasCharacterClasses;
            case 'content':
              return progress.hasContent;
            case 'members':
              return progress.hasMembers;
            default:
              return false;
          }
        });
        isAvailable = requirementsMet;
      }

      // Add badge counts based on current data
      let badge = section.badge;
      if (stats) {
        switch (section.id) {
          case 'attributes':
            badge = stats.customAttributes;
            break;
          case 'character-classes':
            badge = this.characterClasses().length;
            break;
          case 'characters':
            badge = stats.playerCharacters + stats.npcs;
            break;
          case 'content':
            badge = stats.contentPages;
            break;
          case 'trackers':
            badge = stats.activeTrackers;
            break;
          case 'members':
            badge = stats.totalMembers;
            break;
        }
      }

      return {
        ...section,
        isAvailable,
        badge
      };
    });
  });

  // Get the next step in setup process
  public nextSetupStep = computed(() => {
    const progress = this.setupProgress();
    
    if (!progress.hasAttributes) {
      return {
        section: 'attributes',
        title: 'Create Character Attributes',
        description: 'Define the core stats your characters will use (Strength, Intelligence, etc.)',
        icon: 'tune'
      };
    }
    
    if (!progress.hasCharacterClasses) {
      return {
        section: 'character-classes',
        title: 'Create Character Classes',
        description: 'Define classes, races, or archetypes that use your attributes',
        icon: 'school'
      };
    }
    
    if (!progress.hasContent) {
      return {
        section: 'content',
        title: 'Add Game Content',
        description: 'Create rules, lore, and world information for your players',
        icon: 'library_books'
      };
    }
    
    if (!progress.hasMembers) {
      return {
        section: 'members',
        title: 'Invite Players',
        description: 'Add players to your game space and assign permissions',
        icon: 'people'
      };
    }
    
    return null;
  });

  ngOnInit() {
    // Check if we have a current game space
    if (!this.currentGameSpace()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Load all content for the current game space
    this.loadGameSpaceContent();

    // Load stats for the current game space
    const gameSpaceId = this.currentGameSpace()?.id;
    if (gameSpaceId) {
      this.gameSpaceService.loadGameSpaceStats(gameSpaceId);
    }

    // Set active tab based on route
    const routeSegment = this.route.snapshot.firstChild?.routeConfig?.path;
    if (routeSegment && this.adminSections().find(s => s.route === routeSegment)) {
      this.activeTabSignal.set(routeSegment);
    }
  }

  private async loadGameSpaceContent() {
    const gameSpace = this.currentGameSpace();
    if (!gameSpace) return;

    try {
      await Promise.all([
        this.contentService.loadDynamicAttributes(gameSpace.id),
        this.contentService.loadCharacterClasses(gameSpace.id),
        this.contentService.loadTextSections(gameSpace.id)
      ]);
    } catch (error) {
      console.error('Error loading game space content:', error);
      this.snackBar.open('Error loading game space content', 'Dismiss', { duration: 3000 });
    }
  }

  onBackToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  onSectionSelect(section: AdminSection) {
    if (!section.isAvailable) {
      this.snackBar.open(
        section.lockedMessage || 'This section is not yet available',
        'Dismiss',
        { duration: 4000 }
      );
      return;
    }

    this.activeTabSignal.set(section.id);
    this.router.navigate(['/admin', section.route]);
  }

  onQuickAction(action: string) {
    const availableSections = this.adminSections().filter(s => s.isAvailable);
    
    switch (action) {
      case 'add_npc':
      case 'add_character':
        const charactersSection = availableSections.find(s => s.id === 'characters');
        if (charactersSection) {
          this.onSectionSelect(charactersSection);
        } else {
          this.showSetupRequiredMessage('characters');
        }
        break;
        
      case 'add_attribute':
        const attributesSection = availableSections.find(s => s.id === 'attributes');
        if (attributesSection) {
          this.onSectionSelect(attributesSection);
        }
        break;
        
      case 'add_class':
        const classesSection = availableSections.find(s => s.id === 'character-classes');
        if (classesSection) {
          this.onSectionSelect(classesSection);
        } else {
          this.showSetupRequiredMessage('character-classes');
        }
        break;
        
      case 'add_tracker':
        const trackersSection = availableSections.find(s => s.id === 'trackers');
        if (trackersSection) {
          this.onSectionSelect(trackersSection);
        } else {
          this.showSetupRequiredMessage('trackers');
        }
        break;
        
      case 'invite_player':
        const membersSection = availableSections.find(s => s.id === 'members');
        if (membersSection) {
          this.onSectionSelect(membersSection);
        } else {
          this.showSetupRequiredMessage('members');
        }
        break;
        
      case 'add_content':
        const contentSection = availableSections.find(s => s.id === 'content');
        if (contentSection) {
          this.onSectionSelect(contentSection);
        }
        break;
        
      default:
        this.snackBar.open(`${action} feature coming soon!`, 'Dismiss', { duration: 3000 });
        break;
    }
  }

  private showSetupRequiredMessage(sectionId: string) {
    const section = this.adminSections().find(s => s.id === sectionId);
    if (section?.lockedMessage) {
      this.snackBar.open(section.lockedMessage, 'Dismiss', { duration: 4000 });
    }
  }

  onNextSetupStep() {
    const nextStep = this.nextSetupStep();
    if (nextStep) {
      const section = this.adminSections().find(s => s.id === nextStep.section);
      if (section) {
        this.onSectionSelect(section);
      }
    }
  }

  getGameSpaceName(): string {
    return this.currentGameSpace()?.name || 'Unknown Game Space';
  }

  getGameSpaceDescription(): string {
    return this.currentGameSpace()?.description || 'No description available';
  }

  getQuickStats() {
    const stats = this.currentGameSpaceStats();
    if (!stats) {
      return {
        playerCharacters: 0,
        npcs: 0,
        contentPages: 0,
        customAttributes: 0,
        activeTrackers: 0,
        totalMembers: 0
      };
    }
    
    return {
      playerCharacters: stats.playerCharacters,
      npcs: stats.npcs,
      contentPages: stats.contentPages,
      customAttributes: stats.customAttributes,
      activeTrackers: stats.activeTrackers,
      totalMembers: stats.totalMembers
    };
  }

  async refreshStats() {
    const gameSpaceId = this.currentGameSpace()?.id;
    if (gameSpaceId) {
      await this.gameSpaceService.loadGameSpaceStats(gameSpaceId);
      await this.loadGameSpaceContent(); // Refresh content too
      
      this.snackBar.open('Statistics refreshed', 'Dismiss', { duration: 2000 });
    }
  }

  isStatsLoading(): boolean {
    return this.isLoading();
  }

  hasStatsData(): boolean {
    return !!this.currentGameSpaceStats();
  }

  getLastActivity(): string {
    const stats = this.currentGameSpaceStats();
    if (!stats?.lastActivity) {
      return 'No recent activity';
    }

    const lastActivityDate = new Date(stats.lastActivity);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Less than an hour ago';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  }

  getTotalCharacters(): number {
    const stats = this.currentGameSpaceStats();
    return stats ? stats.playerCharacters + stats.npcs : 0;
  }

  getSetupCompletion(): number {
    const progress = this.setupProgress();
    return Math.round((progress.completedSteps / progress.totalSteps) * 100);
  }
}