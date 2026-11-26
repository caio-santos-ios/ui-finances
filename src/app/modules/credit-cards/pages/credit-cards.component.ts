import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import Swal from 'sweetalert2';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import {
  CreditCardDto,
  CreditCardInvoiceDto,
  CreditCardService,
  CreditCardTransactionDto,
} from '../services/credit-card.service';
import { CreditCardModalComponent } from '../components/modal/credit-card-modal/credit-card-modal.component';
import { CreditCardTransactionModalComponent } from '../components/modal/credit-card-transaction-modal/credit-card-transaction-modal.component';
import { CreditCardPaymentModalComponent } from '../components/modal/credit-card-payment-modal/credit-card-payment-modal.component';

@Component({
  selector: 'app-credit-cards',
  standalone: true,
  templateUrl: './credit-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, MoneyPipe],
})
export class CreditCardsComponent extends MyFinance implements OnInit {
  isLoadingCards = true;
  isLoadingInvoices = false;
  isLoadingTransactions = false;

  cards: CreditCardDto[] = [];
  selectedCard: CreditCardDto | null = null;

  invoices: CreditCardInvoiceDto[] = [];
  selectedInvoice: CreditCardInvoiceDto | null = null;

  transactions: CreditCardTransactionDto[] = [];
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  constructor(
    private dialog: Dialog,
    private creditCardService: CreditCardService,
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await this.loadCards();
  }

  get sortedTransactions(): CreditCardTransactionDto[] {
    let list = this.transactions || [];
    if (this.sortColumn) {
      return this.sortData(list, this.sortColumn, this.sortColumn, this.sortDirection).list;
    }
    return list;
  }

  onSort(column: string): void {
    this.sortDirection =
      this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn = column;
    this.cdr.markForCheck();
  }

  async loadCards(preserveCardId?: string, preserveInvoiceId?: string): Promise<void> {
    try {
      this.isLoadingCards = true;
      this.cdr.markForCheck();

      this.cards = await this.creditCardService.getAll();

      if (this.cards.length === 0) {
        this.selectedCard = null;
        this.invoices = [];
        this.selectedInvoice = null;
        this.transactions = [];
        return;
      }

      const targetId = preserveCardId || this.selectedCard?.id;
      const found = targetId ? this.cards.find((c) => c.id === targetId) : null;
      await this.selectCard(found || this.cards[0], preserveInvoiceId);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoadingCards = false;
      this.cdr.markForCheck();
    }
  }

  async selectCard(card: CreditCardDto, preserveInvoiceId?: string): Promise<void> {
    this.selectedCard = card;
    this.invoices = [];
    this.selectedInvoice = null;
    this.transactions = [];
    this.cdr.markForCheck();

    await this.loadInvoices(card.id, preserveInvoiceId);
  }

  async loadInvoices(cardId: string, preserveInvoiceId?: string): Promise<void> {
    try {
      this.isLoadingInvoices = true;
      this.cdr.markForCheck();

      this.invoices = await this.creditCardService.getInvoices(cardId);

      if (this.invoices.length === 0) {
        this.selectedInvoice = null;
        this.transactions = [];
        return;
      }

      let target = preserveInvoiceId
        ? this.invoices.find((i) => i.id === preserveInvoiceId)
        : undefined;

      if (!target) {
        // Prioriza a fatura aberta atual (não futura) ou a primeira não paga
        target =
          this.invoices.find((i) => i.status === 'open' && !i.isFuture) ||
          this.invoices.find((i) => i.status === 'closed') ||
          this.invoices.find((i) => i.status !== 'paid') ||
          this.invoices[this.invoices.length - 1];
      }

      await this.selectInvoice(target);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoadingInvoices = false;
      this.cdr.markForCheck();
    }
  }

  async selectInvoice(invoice: CreditCardInvoiceDto): Promise<void> {
    this.selectedInvoice = invoice;
    this.transactions = [];
    this.cdr.markForCheck();

    if (!this.selectedCard) return;

    try {
      this.isLoadingTransactions = true;
      this.cdr.markForCheck();
      this.transactions = await this.creditCardService.getInvoiceTransactions(
        this.selectedCard.id,
        invoice.id,
      );
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoadingTransactions = false;
      this.cdr.markForCheck();
    }
  }

  openCardModal(card?: CreditCardDto, event?: Event): void {
    if (event) event.stopPropagation();
    const ref = this.dialog.open(CreditCardModalComponent, {
      data: { card },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadCards(card?.id);
    });
  }

  openTransactionModal(tx?: CreditCardTransactionDto): void {
    if (this.cards.length === 0) {
      this.toastWarning('Cadastre um cartão de crédito primeiro.');
      return;
    }
    const ref = this.dialog.open(CreditCardTransactionModalComponent, {
      data: {
        cards: this.cards,
        defaultCardId: this.selectedCard?.id,
        transaction: tx,
      },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadCards(this.selectedCard?.id, this.selectedInvoice?.id);
    });
  }

  openPaymentModal(): void {
    if (!this.selectedCard || !this.selectedInvoice) return;
    const ref = this.dialog.open(CreditCardPaymentModalComponent, {
      data: {
        card: this.selectedCard,
        invoice: this.selectedInvoice,
      },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadCards(this.selectedCard?.id, this.selectedInvoice?.id);
    });
  }

  async deleteCard(card: CreditCardDto, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const result = await Swal.fire({
      title: 'Excluir cartão de crédito?',
      text: `Deseja excluir o cartão "${card.name}" e todas as suas faturas?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'bg-card text-foreground border border-border rounded-xl shadow-2xl',
        title: 'text-foreground font-semibold',
        htmlContainer: 'text-muted-foreground',
        confirmButton: 'bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
        cancelButton: 'bg-muted text-muted-foreground font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
        actions: 'gap-2',
      },
      buttonsStyling: false,
    });
    if (!result.isConfirmed) return;

    try {
      await this.creditCardService.delete(card.id);
      this.toastSuccess('Cartão excluído com sucesso.');
      await this.loadCards();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async deleteTransaction(tx: CreditCardTransactionDto): Promise<void> {
    const isInstallment = tx.totalInstallments > 1 && !!tx.installmentGroupId;
    const result = await Swal.fire({
      title: 'Excluir compra?',
      text: isInstallment
        ? `Esta compra faz parte de um parcelamento (${tx.installmentNumber}/${tx.totalInstallments}). Deseja excluir apenas esta parcela ou todas as parcelas?`
        : `Deseja realmente excluir "${tx.description}"?`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: isInstallment,
      confirmButtonText: isInstallment ? 'Apenas esta parcela' : 'Excluir',
      denyButtonText: 'Todas as parcelas',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'bg-card text-foreground border border-border rounded-xl shadow-2xl',
        title: 'text-foreground font-semibold',
        htmlContainer: 'text-muted-foreground',
        confirmButton: 'bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
        denyButton: 'bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
        cancelButton: 'bg-muted text-muted-foreground font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
        actions: 'gap-2',
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed && !result.isDenied) return;

    try {
      const deleteGroup = result.isDenied;
      await this.creditCardService.deleteTransaction(tx.creditCardId, tx.id, deleteGroup);
      this.toastSuccess(deleteGroup ? 'Todas as parcelas foram excluídas.' : 'Lançamento excluído.');
      await this.loadCards(this.selectedCard?.id, this.selectedInvoice?.id);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  getInvoiceStatusLabel(inv: CreditCardInvoiceDto): string {
    if (inv.status === 'paid') return 'Paga';
    if (inv.status === 'closed') return 'Fechada';
    if (inv.isFuture) return 'Futura';
    return 'Aberta';
  }

  getInvoiceStatusClass(inv: CreditCardInvoiceDto): string {
    if (inv.status === 'paid') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    if (inv.status === 'closed') return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    if (inv.isFuture) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-primary/15 text-primary border-primary/30';
  }

  getCardGradient(color: string): string {
    const base = color || '#820ad1';
    return `linear-gradient(135deg, ${base} 0%, #0f172a 100%)`;
  }

  getClampedPercent(pct: number): number {
    if (!pct || pct < 0) return 0;
    return Math.min(pct, 100);
  }
}
