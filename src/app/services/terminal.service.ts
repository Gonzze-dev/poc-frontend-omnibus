import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from '../config';
import { Terminal } from '../models/terminal.model';

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.backendUrl}/api/users/terminals`;

  getAll() {
    return this.http.get<Terminal[]>(this.baseUrl);
  }
}
