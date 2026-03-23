import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Pasaje } from '../models/pasaje.model';
import { APP_CONFIG } from '../config';

@Injectable({ providedIn: 'root' })
export class PasajeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.backendUrl}/pasajes`;

  getByTicket(ticket: string) {
    return this.http.get<Pasaje>(`${this.baseUrl}/${ticket}`);
  }
}
