import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import * as L from 'leaflet';
import { BusArrival, Pasaje } from '../../models/pasaje.model';

const BUS_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

const USER_ICON = L.divIcon({
  className: 'user-location-marker',
  html: '<span class="user-dot"></span><span class="user-pulse"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

@Component({
  selector: 'app-ticket-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './ticket-card.html',
  styleUrl: './ticket-card.css',
})
export class TicketCard {
  readonly pasaje = input.required<Pasaje>();
  readonly arrival = input<BusArrival | null>(null);
  readonly selectedCityOrder = signal<number | null>(null);

  private readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');
  private readonly destroyRef = inject(DestroyRef);
  private map: L.Map | null = null;
  private busMarker: L.Marker | null = null;
  private userMarker: L.Marker | null = null;
  private userAccuracyCircle: L.Circle | null = null;
  private geoWatchId: number | null = null;

  readonly mapsUrl = computed(() => {
    const data = this.arrival();
    if (!data) return null;
    const { lat, lng } = data.coordinates;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  });

  constructor() {
    // effect() está en el constructor: contexto de inyección válido.
    // viewChild solo tiene valor cuando el @if renderiza el #mapEl,
    // por lo que el effect espera naturalmente a que ambos estén listos.
    effect(() => {
      const data = this.arrival();
      const container = this.mapEl();
      if (!data || !container) return;

      const { lat, lng } = data.coordinates;

      if (!this.map) {
        // setTimeout 0: cede el control al browser para que el contenedor
        // tenga sus dimensiones calculadas antes de que Leaflet lo mida.
        requestAnimationFrame(() => {
          if (this.map || !container.nativeElement) return;

          this.map = L.map(container.nativeElement, {
            zoomControl: true,
            attributionControl: false,
          }).setView([lat, lng], 16);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
          this.busMarker = L.marker([lat, lng], { icon: BUS_ICON }).addTo(this.map);

          this.map.invalidateSize();
          this.startUserTracking();

          this.destroyRef.onDestroy(() => {
            this.stopUserTracking();
            this.map?.remove();
            this.map = null;
          });
        });
      } else {
        this.map.setView([lat, lng], 16);
        this.busMarker?.setLatLng([lat, lng]);
      }
    });
  }

  toggleCity(order: number): void {
    this.selectedCityOrder.update((current) => (current === order ? null : order));
  }

  private startUserTracking(): void {
    if (!navigator.geolocation || !this.map) return;

    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng: L.LatLngExpression = [latitude, longitude];

        if (!this.userMarker) {
          this.userMarker = L.marker(latlng, { icon: USER_ICON, zIndexOffset: 1000 }).addTo(this.map!);
          this.userAccuracyCircle = L.circle(latlng, {
            radius: accuracy,
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(this.map!);
        } else {
          this.userMarker.setLatLng(latlng);
          this.userAccuracyCircle?.setLatLng(latlng).setRadius(accuracy);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  private stopUserTracking(): void {
    if (this.geoWatchId !== null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
  }
}
