import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import {
  InvestmentAsset,
  InvestmentService,
  MarketAssetSearchResult,
} from '../../../services/investment.service';

export interface SelectedAssetModel {
  id?: string;
  symbol: string;
  name: string;
  type: string;
  close?: number | null;
  isFromMarket?: boolean;
}

@Component({
  selector: 'app-investment-transaction-modal',
  standalone: true,
  templateUrl: './investment-transaction-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent, NgxMaskDirective],
  providers: [provideNgxMask()],
})
export class InvestmentTransactionModalComponent extends MyFinance implements OnInit, OnDestroy {
  @ViewChild('assetDropdownContainer') assetDropdownContainer?: ElementRef;

  form!: FormGroup;
  isLoading = false;
  assets: InvestmentAsset[] = [];
  banks: any[] = [];

  // Autocomplete state
  searchQuery = '';
  searchResults: (MarketAssetSearchResult & { id?: string })[] = [];
  isSearching = false;
  showDropdown = false;
  selectedAsset: SelectedAssetModel | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: DialogRef,
    private investmentService: InvestmentService,
    @Inject(DIALOG_DATA) public dialogData: { transaction?: any; defaultAssetId?: string; defaultBrokerId?: string }
  ) {
    super();
  }

  get isEdit(): boolean {
    return !!this.dialogData?.transaction?.id;
  }

  get isBuyOrSell(): boolean {
    const k = this.form?.get('kind')?.value;
    return k === 'BUY' || k === 'SELL';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (
      this.showDropdown &&
      this.assetDropdownContainer &&
      !this.assetDropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.showDropdown = false;
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    const tx = this.dialogData?.transaction;
    const defaultDate = tx?.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];

    this.form = this.formBuilder.group({
      kind: [tx?.kind || 'BUY', [Validators.required]],
      investmentAssetId: [tx?.investmentAssetId || this.dialogData?.defaultAssetId || '', [Validators.required]],
      brokerId: [tx?.brokerId || this.dialogData?.defaultBrokerId || '', [Validators.required]],
      date: [defaultDate, [Validators.required]],
      quantity: [tx?.quantity ? tx.quantity.toString() : ''],
      unitPrice: [tx?.unitPrice ? tx.unitPrice.toString() : ''],
      fees: [tx?.fees ? tx.fees.toString() : ''],
      amount: [tx?.amount ? tx.amount.toString() : '', [Validators.required]],
      notes: [tx?.notes || ''],
      createOperation: [false],
    });

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });

    this.loadDependencies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadDependencies() {
    try {
      const [assets, banks] = await Promise.all([
        this.investmentService.getAssets(),
        this.investmentService.getBanks(),
      ]);
      this.assets = assets || [];
      this.banks = banks || [];

      // Pré-carrega o ativo selecionado em caso de edição ou defaultAssetId
      const targetAssetId = this.form.get('investmentAssetId')?.value;
      if (targetAssetId) {
        const found = this.assets.find((a) => a.id === targetAssetId);
        if (found) {
          const sym = found.ticker || found.name;
          this.selectedAsset = {
            id: found.id,
            symbol: sym,
            name: found.name,
            type: found.type,
            close: found.manualPrice,
            isFromMarket: false,
          };
          this.searchQuery = found.ticker ? `${found.ticker} - ${found.name}` : found.name;
        } else if (this.dialogData?.transaction) {
          const tx = this.dialogData.transaction;
          const sym = tx.assetTicker || tx.assetName;
          this.selectedAsset = {
            id: tx.investmentAssetId,
            symbol: sym,
            name: tx.assetName || sym,
            type: tx.assetType || 'STOCK',
            isFromMarket: false,
          };
          this.searchQuery = tx.assetTicker ? `${tx.assetTicker} - ${tx.assetName}` : (tx.assetName || sym);
        }
      }

      this.cdr.markForCheck();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  onSearchInput(value: string) {
    this.searchQuery = value;
    const trimmed = value ? value.trim() : '';

    if (!trimmed || trimmed.length < 2) {
      this.searchResults = [];
      this.showDropdown = false;
      this.isSearching = false;
      this.cdr.markForCheck();
      return;
    }

    this.showDropdown = true;
    this.isSearching = true;
    this.cdr.markForCheck();
    this.searchSubject.next(trimmed);
  }

  onSearchFocus() {
    if (this.searchQuery && this.searchQuery.trim().length >= 2 && !this.selectedAsset) {
      this.showDropdown = true;
      if (this.searchResults.length === 0) {
        this.searchSubject.next(this.searchQuery.trim());
      }
      this.cdr.markForCheck();
    }
  }

  async performSearch(query: string) {
    try {
      this.isSearching = true;
      this.cdr.markForCheck();

      const qLower = query.toLowerCase();

      // 1. Ativos do usuário já existentes que combinam
      const localMatches: (MarketAssetSearchResult & { id?: string })[] = (this.assets || [])
        .filter(
          (a) =>
            (a.ticker && a.ticker.toLowerCase().includes(qLower)) ||
            (a.name && a.name.toLowerCase().includes(qLower))
        )
        .map((a) => ({
          symbol: a.ticker || a.name,
          name: a.name,
          type: a.type || 'STOCK',
          close: a.manualPrice || null,
          alreadyRegistered: true,
          id: a.id,
        }));

      // 2. Consulta à rota de busca de ativos do mercado no backend
      let marketResults: MarketAssetSearchResult[] = [];
      try {
        marketResults = await this.investmentService.searchMarketAssets(query);
      } catch (err) {
        console.warn('Falha na busca de mercado:', err);
      }

      // 3. Mescla resultados
      const combined: (MarketAssetSearchResult & { id?: string })[] = [];
      const seen = new Set<string>();

      for (const loc of localMatches) {
        const key = (loc.symbol || '').toUpperCase();
        seen.add(key);
        combined.push(loc);
      }

      for (const m of marketResults) {
        const key = (m.symbol || '').toUpperCase();
        if (!seen.has(key)) {
          seen.add(key);
          const localAsset = this.assets.find(
            (a) => (a.ticker && a.ticker.toUpperCase() === key) || a.name.toUpperCase() === key
          );
          combined.push({
            ...m,
            alreadyRegistered: !!localAsset || m.alreadyRegistered,
            id: localAsset?.id,
          });
        }
      }

      this.searchResults = combined;
    } catch (error) {
      console.error('Erro ao pesquisar ativos:', error);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
      this.cdr.markForCheck();
    }
  }

  selectAsset(item: MarketAssetSearchResult & { id?: string }) {
    const localAsset = item.id
      ? this.assets.find((a) => a.id === item.id)
      : this.assets.find(
          (a) => (a.ticker && a.ticker.toUpperCase() === item.symbol.toUpperCase())
        );

    this.selectedAsset = {
      id: localAsset ? localAsset.id : undefined,
      symbol: item.symbol,
      name: item.name,
      type: item.type,
      close: item.close,
      isFromMarket: !localAsset,
    };

    this.form.patchValue({
      investmentAssetId: localAsset ? localAsset.id : 'PENDING_MARKET_ASSET',
    });

    this.searchQuery = item.symbol ? `${item.symbol} - ${item.name}` : item.name;
    this.showDropdown = false;

    // Sugere cotação no campo Preço Unitário caso disponível
    if (item.close && item.close > 0) {
      this.form.patchValue({
        unitPrice: item.close.toFixed(2).replace('.', ','),
      });
      this.recalculateTotal();
    } else if (localAsset && localAsset.manualPrice && localAsset.manualPrice > 0) {
      this.form.patchValue({
        unitPrice: localAsset.manualPrice.toFixed(2).replace('.', ','),
      });
      this.recalculateTotal();
    }

    this.cdr.markForCheck();
  }

  clearSelectedAsset() {
    this.selectedAsset = null;
    this.searchQuery = '';
    this.searchResults = [];
    this.showDropdown = false;
    this.form.patchValue({ investmentAssetId: '' });
    this.cdr.markForCheck();
  }

  getAssetTypeLabel(type: string): string {
    switch (type) {
      case 'STOCK':
        return 'Ação';
      case 'FII':
      case 'REIT':
        return 'FII';
      case 'ETF':
        return 'ETF';
      case 'BDR':
        return 'BDR';
      case 'FIXED_INCOME':
        return 'Renda Fixa';
      case 'CRYPTO':
        return 'Cripto';
      default:
        return type || 'Ativo';
    }
  }

  formatPrice(val?: number | null): string {
    if (val === null || val === undefined) return '';
    return `R$ ${val.toFixed(2).replace('.', ',')}`;
  }

  onKindChange() {
    this.recalculateTotal();
    this.cdr.markForCheck();
  }

  private parseMoney(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  }

  recalculateTotal() {
    if (!this.isBuyOrSell) return;

    const raw = this.form.value;
    const qty = parseFloat(raw.quantity) || 0;
    const unitPrice = this.parseMoney(raw.unitPrice);
    const fees = this.parseMoney(raw.fees);

    if (qty > 0 && unitPrice >= 0) {
      const total = raw.kind === 'BUY' ? qty * unitPrice + fees : Math.max(0, qty * unitPrice - fees);
      this.form.patchValue({ amount: total.toFixed(2).replace('.', ',') }, { emitEvent: false });
    }
  }

  async save() {
    if (!this.selectedAsset && !this.form.value.investmentAssetId) {
      this.toastWarning('Selecione um ativo para a movimentação.');
      return;
    }

    if (this.form.invalid && this.form.get('investmentAssetId')?.value !== 'PENDING_MARKET_ASSET') {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      let assetId = this.selectedAsset?.id || this.form.value.investmentAssetId;

      // Se o ativo for oriundo da API e ainda não tiver ID local no usuário,
      // cria o ativo no backend via POST /api/investments/investment-assets/from-market
      if (!assetId || assetId === 'PENDING_MARKET_ASSET') {
        if (!this.selectedAsset) {
          this.toastWarning('Selecione um ativo válido.');
          return;
        }

        const marketResult = await this.investmentService.createFromMarket({
          symbol: this.selectedAsset.symbol,
          type: this.selectedAsset.type || 'STOCK',
          name: this.selectedAsset.name,
        });

        if (!marketResult?.asset?.id) {
          throw new Error('Não foi possível registrar o ativo no seu cadastro.');
        }

        assetId = marketResult.asset.id;
        this.selectedAsset.id = assetId;
        this.selectedAsset.isFromMarket = false;
        this.assets.push(marketResult.asset);
        this.form.patchValue({ investmentAssetId: assetId });
      }

      const raw = this.form.value;
      const qty = parseFloat(raw.quantity) || 0;
      const unitPrice = this.parseMoney(raw.unitPrice);
      const fees = this.parseMoney(raw.fees);
      const amount = this.parseMoney(raw.amount);

      const payload = {
        investmentAssetId: assetId,
        brokerId: raw.brokerId,
        kind: raw.kind,
        date: `${raw.date}T12:00:00.000Z`,
        quantity: qty,
        unitPrice,
        fees,
        amount,
        notes: raw.notes || '',
        createOperation: !!raw.createOperation,
      };

      if (this.isEdit) {
        await this.investmentService.updateTransaction(this.dialogData.transaction.id, payload);
        this.toastSuccess('Movimentação atualizada com sucesso!');
      } else {
        await this.investmentService.createTransaction(payload);
        this.toastSuccess('Movimentação registrada com sucesso!');
      }

      this.dialogRef.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  close() {
    this.dialogRef.close(false);
  }
}
