import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { SupabaseService } from '../../../core/services/supabase';
import { GameSpaceService } from '../game-space';
import { GameSpace } from '../../../shared/models/game-space.model';
import { GameSpaceCreationDialogComponent } from '../game-space-creation-dialog/game-space-creation-dialog';

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
    MatDividerModule,
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

  getUserDisplayName(user: any): string {
    return user?.email?.split('@')[0] || 'User';
  }
}