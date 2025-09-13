import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttributeManager } from './attribute-manager';

describe('AttributeManager', () => {
  let component: AttributeManager;
  let fixture: ComponentFixture<AttributeManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttributeManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttributeManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
