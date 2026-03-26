import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TicketCard } from '../../components/ticket-card/ticket-card';
import { PasajeService } from '../../services/pasaje.service';
import { RealtimeService } from '../../services/realtime.service';
import { TerminalService } from '../../services/terminal.service';
import { Pasaje } from '../../models/pasaje.model';
import { Terminal } from '../../models/terminal.model';

const TICKET_PATTERN = /^[A-Za-z]+-\d+-\d+$/;

@Component({
  selector: 'app-ticket-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TicketCard],
  templateUrl: './ticket-search.html',
  styleUrl: './ticket-search.css',
})
export class TicketSearch implements OnInit {
  private readonly pasajeService = inject(PasajeService);
  private readonly terminalService = inject(TerminalService);
  protected readonly realtimeService = inject(RealtimeService);

  readonly ticketInput = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pasaje = signal<Pasaje | null>(null);

  readonly terminals = signal<Terminal[]>([]);
  readonly postalCodeFilter = signal('');
  readonly selectedTerminalUuid = signal<string | null>(null);

  readonly filteredTerminals = computed(() => {
    const filter = this.postalCodeFilter().trim();
    const all = this.terminals();
    if (!filter) return all;
    return all.filter(t => t.postal_code.includes(filter));
  });

  readonly selectedTerminal = computed(() => {
    const uuid = this.selectedTerminalUuid();
    if (!uuid) return null;
    return this.terminals().find(t => t.uuid === uuid) ?? null;
  });

  ngOnInit(): void {
    this.terminalService.getAll().subscribe({
      next: (data) => this.terminals.set(data),
      error: () => console.error('No se pudieron cargar las terminales.'),
    });
  }

  onPostalCodeFilterChange(value: string): void {
    this.postalCodeFilter.set(value);
    const filtered = this.filteredTerminals();
    const current = this.selectedTerminalUuid();
    if (current && !filtered.some(t => t.uuid === current)) {
      this.selectedTerminalUuid.set(null);
    }
  }

  search(): void {
    const ticket = this.ticketInput().trim();
    this.errorMessage.set(null);

    const terminalUuid = this.selectedTerminalUuid();
    if (!terminalUuid) {
      this.errorMessage.set('Seleccioná una terminal antes de buscar.');
      return;
    }

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
          await this.realtimeService.joinGroup(terminalUuid, data.bus_license_plate);
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
