import { TestBed } from '@angular/core/testing';

import { Guardrail } from './guardrail';

describe('Guardrail', () => {
  let service: Guardrail;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Guardrail);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
