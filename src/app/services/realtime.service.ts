import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BusArrival } from '../models/pasaje.model';
import { PassengerNotification, PassengerNotificationTypeEnum } from '../models/passenger-notification.model';
import { APP_CONFIG } from '../config';

const GLOBAL_SIGNALR_GROUP = 'global';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection: signalR.HubConnection | null = null;
  private currentPlateTerminalGroup: string | null = null;
  private currentTerminalGroup: string | null = null;

  readonly connected = signal(false);
  readonly busArrival = signal<BusArrival | null>(null);

  async start(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${APP_CONFIG.realtimeUrl}/realtime`)
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnected(async () => {
      this.connected.set(true);
      await this.resubscribeGroupsAfterReconnect();
    });
    this.connection.onclose(() => this.connected.set(false));

    this.connection.on('receiveNotification', (msg: PassengerNotification) => {
      console.log('receiveNotification:', msg);

      if (msg?.type === PassengerNotificationTypeEnum.BUS_ARRIVAL) {
        this.busArrival.set(msg.payload as BusArrival);
      }else if (msg?.type === PassengerNotificationTypeEnum.LOCAL) {
        console.log('local:', msg.payload);
      }else if (msg?.type === PassengerNotificationTypeEnum.GLOBAL) {
        console.log('global:', msg.payload);
      }
    });

    await this.connection.start();
    this.connected.set(true);
    await this.connection.invoke('JoinFrontend', GLOBAL_SIGNALR_GROUP);
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

    if (this.currentPlateTerminalGroup || this.currentTerminalGroup) {
      await this.leaveCurrentGroups();
    }

    await this.connection!.invoke('JoinFrontend', groupId);
    await this.connection!.invoke('JoinFrontend', terminal);
    this.currentPlateTerminalGroup = groupId;
    this.currentTerminalGroup = terminal;
  }

  /** Tras reconectar, SignalR no mantiene grupos; se vuelve a unir a global y a los contextos activos. */
  private async resubscribeGroupsAfterReconnect(): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke('JoinFrontend', GLOBAL_SIGNALR_GROUP);
      if (this.currentPlateTerminalGroup) {
        await this.connection.invoke('JoinFrontend', this.currentPlateTerminalGroup);
      }
      if (this.currentTerminalGroup) {
        await this.connection.invoke('JoinFrontend', this.currentTerminalGroup);
      }
    } catch {
      // Hub no disponible o método distinto; no bloquear la UI
    }
  }

  private async leaveCurrentGroups(): Promise<void> {
    if (!this.connection) return;

    if (this.currentPlateTerminalGroup) {
      try {
        await this.connection.invoke('LeaveFrontend', this.currentPlateTerminalGroup);
      } catch {
        // El servidor puede no tener LeaveFrontend, ignorar
      }
      this.currentPlateTerminalGroup = null;
    }

    if (this.currentTerminalGroup) {
      try {
        await this.connection.invoke('LeaveFrontend', this.currentTerminalGroup);
      } catch {
        // El servidor puede no tener LeaveFrontend, ignorar
      }
      this.currentTerminalGroup = null;
    }
  }

  onMessage<T>(method: string, callback: (data: T) => void): void {
    this.connection?.on(method, callback);
  }
}
