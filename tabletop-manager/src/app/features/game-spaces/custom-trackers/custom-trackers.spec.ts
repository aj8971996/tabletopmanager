import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTrackers } from './custom-trackers';

describe('CustomTrackers', () => {
  let component: CustomTrackers;
  let fixture: ComponentFixture<CustomTrackers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomTrackers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
