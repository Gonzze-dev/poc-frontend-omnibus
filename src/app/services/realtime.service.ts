import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BusArrival } from '../models/pasaje.model';
import { PassengerNotification, PassengerNotificationTypeEnum } from '../models/passenger-notification.model';
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

    this.connection.on('receiveNotification', (msg: PassengerNotification) => {
      console.log('receiveNotification:', msg);

      if (msg?.type === PassengerNotificationTypeEnum.BUS_ARRIVAL) {
        this.busArrival.set(msg.payload as BusArrival);
      }
    });

    await this.connection.start();
    this.connected.set(true);
  }

  async joinGroup(terminalUuid: string, busLicensePlate: string): Promise<void> {
    const terminal = terminalUuid.trim();
    const plate = busLicensePlate.trim();
    if (!terminal || !plate) {
      throw new Error('Se requieren terminalUuid y patente para unirse al canal.');
    }

    const groupId = `${plate}:${terminal}`;

    if (!this.connection) {
      await this.start();
    }

    if (this.currentGroup) {
      await this.leaveCurrentGroup();
    }

    await this.connection!.invoke('JoinFrontend', groupId);
    this.currentGroup = groupId;
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
