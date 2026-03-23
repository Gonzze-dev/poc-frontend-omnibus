import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BusArrival } from '../models/pasaje.model';
import { APP_CONFIG } from '../config';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection: signalR.HubConnection | null = null;
  private currentGroup: string | null = null;

  readonly connected = signal(false);
  readonly busArrival = signal<BusArrival | null>(null);

  async start(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${APP_CONFIG.realtimeUrl}/realtime`)
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onclose(() => this.connected.set(false));

    this.connection.on('receiveNotification', (data: BusArrival) => {
      console.log('receiveNotification:', data);
      this.busArrival.set(data);
    });

    await this.connection.start();
    this.connected.set(true);
  }

  async joinGroup(idGroup: string): Promise<void> {
    if (!this.connection) {
      await this.start();
    }

    if (this.currentGroup) {
      await this.leaveCurrentGroup();
    }

    await this.connection!.invoke('JoinFrontend', idGroup);
    this.currentGroup = idGroup;
  }

  private async leaveCurrentGroup(): Promise<void> {
    if (this.connection && this.currentGroup) {
      try {
        await this.connection.invoke('LeaveFrontend', this.currentGroup);
      } catch {
        // El servidor puede no tener LeaveFrontend, ignorar
      }
      this.currentGroup = null;
    }
  }

  onMessage<T>(method: string, callback: (data: T) => void): void {
    this.connection?.on(method, callback);
  }
}
