import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { SupabaseService } from '../../../core/services/supabase';
import { GameSpaceService } from '../game-space';
import { GameSpace } from '../../../shared/models/game-space.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ]
})
export class DashboardComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private gameSpaceService = inject(GameSpaceService);
  private router = inject(Router);

  currentUser = this.supabaseService.currentUser$;
  gameSpaces = this.gameSpaceService.gameSpaces;

  ngOnInit() {
    this.gameSpaceService.loadUserGameSpaces();
  }

  async onSignOut() {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }

  onCreateGameSpace() {
    console.log('Create game space clicked');
  }

  onSelectGameSpace(gameSpace: GameSpace) {
    this.gameSpaceService.setCurrentGameSpace(gameSpace);
    console.log('Selected game space:', gameSpace);
  }

  onManageGameSpace(gameSpace: GameSpace) {
    console.log('Manage game space:', gameSpace);
  }

  getUserDisplayName(user: any): string {
    return user?.email?.split('@')[0] || 'User';
  }
}