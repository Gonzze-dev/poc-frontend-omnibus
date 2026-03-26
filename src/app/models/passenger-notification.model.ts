
export type PassengerNotificationType =
  | 'BUS_ARRIVAL'
  | 'BUS_DELAY'
  | 'LOCAL'
  | 'GLOBAL'

export enum PassengerNotificationTypeEnum {
  BUS_ARRIVAL = 'BUS_ARRIVAL',
  BUS_DELAY = 'BUS_DELAY',
  LOCAL = 'LOCAL',
  GLOBAL = 'GLOBAL',
}

/** Mensaje recibido por SignalR: tipo + carga útil según el tipo. */
export interface PassengerNotification {
  type: PassengerNotificationType;
  payload: unknown;
}
