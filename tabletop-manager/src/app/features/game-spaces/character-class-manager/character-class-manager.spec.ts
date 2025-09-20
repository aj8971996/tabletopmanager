import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharacterClassManager } from './character-class-manager';

describe('CharacterClassManager', () => {
  let component: CharacterClassManager;
  let fixture: ComponentFixture<CharacterClassManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterClassManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CharacterClassManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
