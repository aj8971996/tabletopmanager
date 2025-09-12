import { TestBed } from '@angular/core/testing';

import { GameSpace } from './game-space';

describe('GameSpace', () => {
  let service: GameSpace;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSpace);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
