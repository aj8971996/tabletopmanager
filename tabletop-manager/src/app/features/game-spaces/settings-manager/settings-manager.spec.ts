import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsManager } from './settings-manager';

describe('SettingsManager', () => {
  let component: SettingsManager;
  let fixture: ComponentFixture<SettingsManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
