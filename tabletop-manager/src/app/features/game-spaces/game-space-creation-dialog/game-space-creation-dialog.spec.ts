import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameSpaceCreationDialog } from './game-space-creation-dialog';

describe('GameSpaceCreationDialog', () => {
  let component: GameSpaceCreationDialog;
  let fixture: ComponentFixture<GameSpaceCreationDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameSpaceCreationDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameSpaceCreationDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
