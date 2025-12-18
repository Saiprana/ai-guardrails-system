import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatResponse } from '../models/chat-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Chat {
  private apiUrl = `${environment.apiUrl}/chat/query`;

  constructor(private http: HttpClient) {}

  sendQuery(
    userId: number,
    query: string,
    tools: string[] = ['database_query']
  ): Observable<ChatResponse> {
    const payload = {
      user_id: userId,
      query,
      tools,
    };

    return this.http.post<ChatResponse>(this.apiUrl, payload);
  }
}
