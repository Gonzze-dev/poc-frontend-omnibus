import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TicketCard } from '../../components/ticket-card/ticket-card';
import { PasajeService } from '../../services/pasaje.service';
import { RealtimeService } from '../../services/realtime.service';
import { Pasaje } from '../../models/pasaje.model';

const TICKET_PATTERN = /^[A-Za-z]+-\d+-\d+$/;

@Component({
  selector: 'app-ticket-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TicketCard],
  templateUrl: './ticket-search.html',
  styleUrl: './ticket-search.css',
})
export class TicketSearch {
  private readonly pasajeService = inject(PasajeService);
  protected readonly realtimeService = inject(RealtimeService);

  readonly ticketInput = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pasaje = signal<Pasaje | null>(null);

  search(): void {
    const ticket = this.ticketInput().trim();
    this.errorMessage.set(null);

    if (!TICKET_PATTERN.test(ticket)) {
      this.errorMessage.set(
        'El formato del ticket es inválido. Debe ser: PREFIJO-NÚMERO-NÚMERO (ej: FLE-002-2026)'
      );
      return;
    }

    this.loading.set(true);

    this.pasajeService.getByTicket(ticket).subscribe({
      next: async (data) => {
        this.pasaje.set(data);
        this.loading.set(false);

        try {
          await this.realtimeService.joinGroup(data.bus_license_plate);
        } catch {
          console.error('No se pudo conectar al canal en tiempo real.');
        }
      },
      error: () => {
        this.errorMessage.set('Ocurrió un error al obtener la información del pasaje.');
        this.loading.set(false);
      },
    });
  }
}
