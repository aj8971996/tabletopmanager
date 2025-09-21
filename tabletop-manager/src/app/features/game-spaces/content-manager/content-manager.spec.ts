import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentManager } from './content-manager';

describe('ContentManager', () => {
  let component: ContentManager;
  let fixture: ComponentFixture<ContentManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
