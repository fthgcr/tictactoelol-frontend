import { TestBed } from '@angular/core/testing';

import { LolChampionsExternalService } from './lol-champions-external.service';

describe('LolChampionsExternalService', () => {
  let service: LolChampionsExternalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LolChampionsExternalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
