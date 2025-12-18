import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Guardrail {
  private apiUrl = `${environment.apiUrl}/guardrails`;

  constructor(private http: HttpClient) {}

  getGuardrails(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  toggleGuardrail(id: number, enabled: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/toggle`, { enabled });
  }
}

// //Trial
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../environments/environment';

// @Injectable({
//   providedIn: 'root',
// })
// export class Guardrail {
//   private apiUrl = `${environment.apiUrl}/guardrails`;

//   constructor(private http: HttpClient) {}

//   getAll(): Observable<any[]> {
//     return this.http.get<any[]>(this.apiUrl);
//   }

//   create(rule: any): Observable<any> {
//     return this.http.post<any>(this.apiUrl, rule);
//   }

//   update(id: number, rule: any): Observable<any> {
//     return this.http.put<any>(`${this.apiUrl}/${id}`, rule);
//   }

//   delete(id: number): Observable<void> {
//     return this.http.delete<void>(`${this.apiUrl}/${id}`);
//   }
// }