import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuardrailForm } from './guardrail-form';

describe('GuardrailForm', () => {
  let component: GuardrailForm;
  let fixture: ComponentFixture<GuardrailForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardrailForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuardrailForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
