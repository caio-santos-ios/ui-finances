import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import {
  B3ImportRow,
  B3PreviewResponse,
  InvestmentService,
} from '../../../services/investment.service';

@Component({
  selector: 'app-b3-import-modal',
  standalone: true,
  templateUrl: './b3-import-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, MoneyPipe],
})
export class B3ImportModalComponent extends MyFinance implements OnInit {
  step: 'upload' | 'preview' = 'upload';
  selectedFile: File | null = null;
  isDragging = false;
  isLoadingPreview = false;
  isConfirming = false;

  previewData: B3PreviewResponse | null = null;
  filterTab: 'all' | 'new' | 'duplicate' | 'warning' = 'all';
  searchTerm: string = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  constructor(
    private dialogRef: DialogRef<boolean>,
    private investmentService: InvestmentService,
  ) {
    super();
  }

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
    this.cdr.markForCheck();
  }

  removeFile(): void {
    this.selectedFile = null;
    this.cdr.markForCheck();
  }

  private validateAndSetFile(file: File): void {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.toastWarning('Formato inválido. Por favor, envie um arquivo .csv ou .xlsx da B3.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.toastWarning('O arquivo selecionado excede o limite máximo de 15MB.');
      return;
    }

    this.selectedFile = file;
    this.cdr.markForCheck();
  }

  async loadPreview(): Promise<void> {
    if (!this.selectedFile) {
      this.toastWarning('Selecione uma planilha da B3 para continuar.');
      return;
    }

    try {
      this.isLoadingPreview = true;
      this.cdr.markForCheck();

      const data = await this.investmentService.previewB3Import(this.selectedFile);

      if (!data || !data.rows || data.rows.length === 0) {
        this.toastWarning('Nenhuma movimentação foi encontrada nesta planilha.');
        return;
      }

      // Initialize default selection: non-duplicate rows checked by default
      data.rows.forEach((r) => {
        r.selected = !r.isDuplicate;
      });

      this.previewData = data;
      this.step = 'preview';
    } catch (error: any) {
      this.normalizeErr(error);
    } finally {
      this.isLoadingPreview = false;
      this.cdr.markForCheck();
    }
  }

  backToUpload(): void {
    this.step = 'upload';
    this.filterTab = 'all';
    this.searchTerm = '';
    this.cdr.markForCheck();
  }

  get filteredRows(): B3ImportRow[] {
    if (!this.previewData?.rows) return [];

    let list = this.previewData.rows;

    if (this.filterTab === 'new') {
      list = list.filter((r) => !r.isDuplicate);
    } else if (this.filterTab === 'duplicate') {
      list = list.filter((r) => r.isDuplicate);
    } else if (this.filterTab === 'warning') {
      list = list.filter((r) => r.hasWarning);
    }

    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.ticker.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.brokerName.toLowerCase().includes(q)
      );
    }

    if (this.sortColumn) {
      list = this.sortData(list, this.sortColumn, this.sortColumn, this.sortDirection).list;
    }

    return list;
  }

  onSort(column: string): void {
    this.sortDirection =
      this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn = column;
    this.cdr.markForCheck();
  }

  get selectedCount(): number {
    if (!this.previewData?.rows) return 0;
    return this.previewData.rows.filter((r) => r.selected && !r.isDuplicate).length;
  }

  get totalSelectableCount(): number {
    if (!this.previewData?.rows) return 0;
    return this.previewData.rows.filter((r) => !r.isDuplicate).length;
  }

  get isAllSelected(): boolean {
    const selectable = this.filteredRows.filter((r) => !r.isDuplicate);
    if (selectable.length === 0) return false;
    return selectable.every((r) => r.selected);
  }

  get isIndeterminate(): boolean {
    const selectable = this.filteredRows.filter((r) => !r.isDuplicate);
    if (selectable.length === 0) return false;
    const count = selectable.filter((r) => r.selected).length;
    return count > 0 && count < selectable.length;
  }

  toggleSelectAll(checked: boolean): void {
    const selectable = this.filteredRows.filter((r) => !r.isDuplicate);
    selectable.forEach((r) => {
      r.selected = checked;
    });
    this.cdr.markForCheck();
  }

  toggleRow(row: B3ImportRow): void {
    if (row.isDuplicate) return;
    row.selected = !row.selected;
    this.cdr.markForCheck();
  }

  setFilterTab(tab: 'all' | 'new' | 'duplicate' | 'warning'): void {
    this.filterTab = tab;
    this.cdr.markForCheck();
  }

  async confirmImport(): Promise<void> {
    if (!this.previewData?.rows) return;

    const itemsToImport = this.previewData.rows.filter((r) => r.selected && !r.isDuplicate);

    if (itemsToImport.length === 0) {
      this.toastWarning('Selecione ao menos uma movimentação para importar.');
      return;
    }

    try {
      this.isConfirming = true;
      this.cdr.markForCheck();

      const res = await this.investmentService.confirmB3Import(itemsToImport);

      const msg = res.importedCount === 1
        ? '1 movimentação importada com sucesso!'
        : `${res.importedCount} movimentações importadas com sucesso!`;

      this.toastSuccess(msg);
      this.dialogRef.close(true);
    } catch (error: any) {
      this.normalizeErr(error);
    } finally {
      this.isConfirming = false;
      this.cdr.markForCheck();
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
