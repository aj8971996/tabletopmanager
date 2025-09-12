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

import { GameSpaceService } from '../game-space';
import { GameSpace } from '../../../shared/models';

interface AdminSection {
  id: string;
  label: string;
  icon: string;
  description: string;
  badge?: number;
  route: string;
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
    MatToolbarModule
  ]
})
export class AdminPanelComponent implements OnInit {
  private gameSpaceService = inject(GameSpaceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  // Service signals
  currentGameSpace = this.gameSpaceService.currentGameSpace;
  currentGameSpaceStats = this.gameSpaceService.currentGameSpaceStats;
  isLoading = this.gameSpaceService.isLoading;
  error = this.gameSpaceService.error;
  
  private activeTabSignal = signal('overview');
  public activeTab = computed(() => this.activeTabSignal());

  public adminSections: AdminSection[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'dashboard',
      description: 'Game space statistics and quick actions',
      route: 'overview'
    },
    {
      id: 'content',
      label: 'Content Library',
      icon: 'library_books',
      description: 'Manage rules, lore, and world information',
      route: 'content'
    },
    {
      id: 'characters',
      label: 'Characters',
      icon: 'groups',
      description: 'NPCs and player character management',
      route: 'characters'
    },
    {
      id: 'attributes',
      label: 'Custom Attributes',
      icon: 'tune',
      description: 'Define character stats and calculations',
      route: 'attributes'
    },
    {
      id: 'trackers',
      label: 'Custom Trackers',
      icon: 'track_changes',
      description: 'Token and slide-based progress tracking',
      route: 'trackers'
    },
    {
      id: 'members',
      label: 'Members',
      icon: 'people',
      description: 'Manage players and permissions',
      route: 'members'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      description: 'Game space configuration and options',
      route: 'settings'
    }
  ];

  ngOnInit() {
    // Check if we have a current game space, if not redirect to dashboard
    if (!this.currentGameSpace()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Load stats for the current game space
    const gameSpaceId = this.currentGameSpace()?.id;
    if (gameSpaceId) {
      this.gameSpaceService.loadGameSpaceStats(gameSpaceId);
    }

    // Set active tab based on route
    const routeSegment = this.route.snapshot.firstChild?.routeConfig?.path;
    if (routeSegment && this.adminSections.find(s => s.route === routeSegment)) {
      this.activeTabSignal.set(routeSegment);
    }

    // Watch for errors and show snack bar
    const errorSignal = this.error();
    if (errorSignal) {
      this.snackBar.open(errorSignal, 'Dismiss', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      this.gameSpaceService.clearError();
    }
  }

  onBackToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  onSectionSelect(section: AdminSection) {
    this.activeTabSignal.set(section.id);
    this.router.navigate(['/admin', section.route]);
  }

  onQuickAction(action: string) {
    switch (action) {
      case 'add_npc':
        this.onSectionSelect(this.adminSections.find(s => s.id === 'characters')!);
        break;
      case 'add_attribute':
        this.onSectionSelect(this.adminSections.find(s => s.id === 'attributes')!);
        break;
      case 'add_tracker':
        this.onSectionSelect(this.adminSections.find(s => s.id === 'trackers')!);
        break;
      case 'invite_player':
        this.onSectionSelect(this.adminSections.find(s => s.id === 'members')!);
        break;
      case 'add_content':
        this.onSectionSelect(this.adminSections.find(s => s.id === 'content')!);
        break;
      default:
        this.snackBar.open(`${action} feature coming soon!`, 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        break;
    }
  }

  getGameSpaceName(): string {
    return this.currentGameSpace()?.name || 'Unknown Game Space';
  }

  getGameSpaceDescription(): string {
    return this.currentGameSpace()?.description || 'No description available';
  }

  // Real data from service - replaces mock data
  getQuickStats() {
    const stats = this.currentGameSpaceStats();
    if (!stats) {
      return {
        playerCharacters: 0,
        npcs: 0,
        contentPages: 0,
        customAttributes: 0,
        activeTrackers: 0
      };
    }
    
    return {
      playerCharacters: stats.playerCharacters,
      npcs: stats.npcs,
      contentPages: stats.contentPages,
      customAttributes: stats.customAttributes,
      activeTrackers: stats.activeTrackers
    };
  }

  // Update badge counts from real data
  updateBadgeCounts() {
    const stats = this.currentGameSpaceStats();
    if (stats) {
      // Update members badge
      const membersSection = this.adminSections.find(s => s.id === 'members');
      if (membersSection) {
        membersSection.badge = stats.totalMembers;
      }
    }
  }

  // Refresh stats manually
  async refreshStats() {
    const gameSpaceId = this.currentGameSpace()?.id;
    if (gameSpaceId) {
      await this.gameSpaceService.loadGameSpaceStats(gameSpaceId);
      this.updateBadgeCounts();
      
      this.snackBar.open('Statistics refreshed', 'Dismiss', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  // Check if stats are loading
  isStatsLoading(): boolean {
    return this.isLoading();
  }

  // Check if we have any stats data
  hasStatsData(): boolean {
    return !!this.currentGameSpaceStats();
  }

  // Get formatted last activity
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

  // Get total characters count
  getTotalCharacters(): number {
    const stats = this.currentGameSpaceStats();
    return stats ? stats.playerCharacters + stats.npcs : 0;
  }

  // Get completion percentage for setup
  getSetupCompletion(): number {
    const stats = this.currentGameSpaceStats();
    if (!stats) return 0;

    let completed = 0;
    const total = 4;

    if (stats.customAttributes > 0) completed++;
    if (stats.playerCharacters > 0 || stats.npcs > 0) completed++;
    if (stats.contentPages > 0) completed++;
    if (stats.totalMembers > 1) completed++; // More than just the GM

    return Math.round((completed / total) * 100);
  }
}