import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PixelButtonComponent } from './pixel-button.component';

describe('PixelButtonComponent', () => {
  let component: PixelButtonComponent;
  let fixture: ComponentFixture<PixelButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PixelButtonComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PixelButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
