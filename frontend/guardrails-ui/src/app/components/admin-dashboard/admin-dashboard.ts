import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Guardrail } from '../../services/guardrail';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit {
  guardrails: any[] = [];
  // loading = true;
  loading = false;
  error = '';

  constructor(private guardrailService: Guardrail) {}

  ngOnInit() {
    this.loadGuardrails();
    console.log('Admin dashboard loaded');
  }

  loadGuardrails() {
    this.loading = true;
    this.guardrailService.getGuardrails().subscribe({
      next: (res:any) => {
        this.guardrails = res.data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load guardrails';
        this.loading = false;
      }
    });
  }

  toggle(rule: any) {
    const previous = rule.enabled;

    // optimistic UI update
    rule.enabled = !rule.enabled;

    this.guardrailService
      .toggleGuardrail(rule.id, !rule.enabled)
      .subscribe({
        error: () => {
          // rollback on failure
          rule.enabled = previous;
          alert('Failed to update guardrail');
        }
      });
  }
}

// import { Component } from '@angular/core';

// @Component({
//   standalone: true,
//   selector: 'app-admin-dashboard',
//   imports: [],
//   templateUrl: './admin-dashboard.html',
//   styleUrl: './admin-dashboard.css',
// })
// export class AdminDashboard {

// }
