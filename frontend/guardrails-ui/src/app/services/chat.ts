// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class Chat {
  
// }
//Trial
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Chat {
  private apiUrl = `${environment.apiUrl}/chat/query`;

  constructor(private http: HttpClient) {}

  sendQuery(payload: {
    user_id: number;
    query: string;
    tools: string[];
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }
}