import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentCreator } from './content-creator';

describe('ContentCreator', () => {
  let component: ContentCreator;
  let fixture: ComponentFixture<ContentCreator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentCreator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentCreator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
