export interface TripCity {
  city_name: string;
  start_date: string;
  end_date: string;
  order: number;
}

export interface Pasaje {
  postal_code: string;
  bus_terminal_name: string;
  ticket: string;
  dni: string;
  name: string;
  bus_license_plate: string;
  enterprise: string;
  start_date: string;
  end_date: string;
  trip_city: TripCity[];
  uuid: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BusArrival {
  anden: string;
  coordinates: Coordinates;
}
