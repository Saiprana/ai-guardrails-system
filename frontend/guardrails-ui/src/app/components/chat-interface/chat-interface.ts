import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../services/chat';
import { ChatResponse } from '../../models/chat-response.model';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-interface.html',
  styleUrls: ['./chat-interface.css'],
})
export class ChatInterface {
  // UI state
  query = '';
  selectedUserId = 1;
  selectedTools: string[] = ['database_query'];
  loading = false;

  // Response state
  responseData: any = null;
  hooksTriggered: string[] = [];
  blocked = false;
  dataMasked = false;
  riskScore = 0;
  auditId?: number;
  errorMessage = '';

  users = [
  { id: 1, label: 'Admin (System)' },
  { id: 2, label: 'Admin (HR - Linda)' },

  { id: 3, label: 'Manager (Engineering - Sarah)' },
  { id: 4, label: 'Manager (Sales - Michael)' },
  { id: 5, label: 'Manager (Finance - Patricia)' },

  { id: 6, label: 'Employee (Engineering - Alisha)' },
  { id: 7, label: 'Employee (Engineering - Nelson)' },
  { id: 8, label: 'Employee (Engineering - David)' },
  { id: 9, label: 'Employee (Sales - Jessica)' },
  { id: 10, label: 'Employee (Sales - Robert)' },
];

  constructor(private chatService: Chat) {}

  toggleTool(tool: string, checked: boolean) {
    if (checked && !this.selectedTools.includes(tool)) {
      this.selectedTools.push(tool);
    } else if (!checked) {
      this.selectedTools = this.selectedTools.filter(t => t !== tool);
    }
  }

  get isBlocked(): boolean {
    return this.blocked === true;
  }

  sendQuery() {
    if (!this.query.trim()) {
      return;
    }

    // TOOL SELECTION GUARD
    if (this.selectedTools.length === 0) {
      this.errorMessage = 'Select at least one tool';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.responseData = null;

    this.chatService
      .sendQuery(this.selectedUserId, this.query, this.selectedTools)
      .subscribe({
        next: (res: ChatResponse) => {
          this.responseData = res.data.response;
          this.hooksTriggered = res.data.hooks_triggered || [];
          this.blocked = res.data.blocked;
          this.dataMasked = res.data.data_masked;
          this.riskScore = res.data.risk_score;
          this.auditId = res.data.audit_id;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.error || 'Failed to execute query';
          this.loading = false;
        },
      });
  }
}
