import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberManager } from './member-manager';

describe('MemberManager', () => {
  let component: MemberManager;
  let fixture: ComponentFixture<MemberManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
