import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentLibrary } from './content-library';

describe('ContentLibrary', () => {
  let component: ContentLibrary;
  let fixture: ComponentFixture<ContentLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentLibrary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentLibrary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
