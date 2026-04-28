import { inject, Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { BusArrival } from '../models/pasaje.model';
import { PassengerNotification, PassengerNotificationTypeEnum } from '../models/passenger-notification.model';
import { APP_CONFIG } from '../config';
import { AuthService } from './auth.service';

const GLOBAL_SIGNALR_GROUP = 'global';

/** Grupo SignalR por terminal para rol admin: `admin` + uuid de terminal. */
export function adminTerminalGroupId(terminalUuid: string): string {
  return `admin/${terminalUuid.trim()}`;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);

  private connection: signalR.HubConnection | null = null;
  private currentPlateTerminalGroup: string | null = null;
  private currentTerminalGroup: string | null = null;
  private adminTerminalGroupIds: string[] = [];

  readonly connected = signal(false);
  readonly busArrival = signal<BusArrival | null>(null);

  async start(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${APP_CONFIG.realtimeUrl}/realtime?apiKey=${APP_CONFIG.realtimeApiKey}`)
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
      } else if (msg?.type === PassengerNotificationTypeEnum.BUS_DELAY) {
        console.log('bus delay:', msg.payload);
      }
      else if (msg?.type === PassengerNotificationTypeEnum.GLOBAL) {
        console.log('global:', msg.payload);
      }
      else if (msg?.type === PassengerNotificationTypeEnum.CAMERA) {
        console.log('camera:', msg.payload);
      }
    });

    await this.connection.start();
    this.connected.set(true);
    await this.connection.invoke('JoinFrontend', GLOBAL_SIGNALR_GROUP);
    await this.syncAdminTerminalGroupsFromApi();
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
      for (const id of this.adminTerminalGroupIds) {
        await this.connection.invoke('JoinFrontend', id);
      }
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

  private async syncAdminTerminalGroupsFromApi(): Promise<void> {
    if (!this.connection || !this.auth.accessToken()) return;
    try {
      const me = await firstValueFrom(this.auth.syncUserFromMe());
      if (me.rol !== 'admin' || !me.terminals?.length) {
        await this.clearAdminTerminalGroups();
        return;
      }
      const ids = me.terminals.map((t) => adminTerminalGroupId(t.uuid));
      await this.setAdminTerminalGroups(ids);
    } catch {
      // Sin sesión o /me no disponible
    }
  }

  private async setAdminTerminalGroups(groupIds: string[]): Promise<void> {
    if (!this.connection) return;
    for (const id of this.adminTerminalGroupIds) {
      try {
        await this.connection.invoke('LeaveFrontend', id);
      } catch {
        // El servidor puede no tener LeaveFrontend
      }
    }
    this.adminTerminalGroupIds = [];
    for (const id of groupIds) {
      try {
        await this.connection.invoke('JoinFrontend', id);
        this.adminTerminalGroupIds.push(id);
      } catch {
        // Hub no disponible
      }
    }
  }

  private async clearAdminTerminalGroups(): Promise<void> {
    await this.setAdminTerminalGroups([]);
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
