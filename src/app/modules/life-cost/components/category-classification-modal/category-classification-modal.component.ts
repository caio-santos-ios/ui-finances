import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-category-classification-modal',
  standalone: true,
  templateUrl: './category-classification-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent],
})
export class CategoryClassificationModalComponent extends MyFinance implements OnInit {
  categories: any[] = [];
  isLoading = false;

  constructor(private dialogRef: DialogRef) {
    super();
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  async loadCategories() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();
      const { data } = await api.get('/life-cost/categories/classification');
      this.categories = data?.data || [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async saveClassification(item: any) {
    try {
      await api.put(`/life-cost/categories/${item.id}/classification`, {
        lifeCostClass: item.lifeCostClass,
        lifeCostRecurrence: item.lifeCostRecurrence,
      });
      item.isUnclassified = false;
      this.toastSuccess(`Categoria "${item.name}" atualizada!`);
      this.cdr.markForCheck();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  close(result: boolean = false) {
    this.dialogRef.close(result);
  }
}
