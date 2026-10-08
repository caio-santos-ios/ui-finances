import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { Dialog } from '@angular/cdk/dialog';
import { CategoryModalComponent } from '../components/modal/category-modal.component';
import { ResetPagination, TPagination } from 'src/app/shared/models/pagination';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, BreadcrumbComponent, ButtonComponent],
})
export class CategoryComponent implements OnInit {
  constructor(private dialog: Dialog) { }

  pagination: TPagination = ResetPagination;
  totalPages: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadData(1);
  }

  async loadData(page: number) {
    try {
      const { data } = await api.get(`/categories?deleted=false&page=${page}`);
      this.pagination = data.data;
      const count = Number(this.pagination.totalPages) || 0;
      this.totalPages = Array.from({ length: count }, (_, i) => i + 1);
    } catch (error) { }
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.currentPage) return;
    this.loadData(page);
  }

  async openModal(id: string = '') {
    const ref = this.dialog.open(CategoryModalComponent, { data: { id } });

    ref.closed.subscribe(async (result) => {
      if (result) {
        await this.loadData(this.pagination.currentPage || 1);
      }
    });
  }

  async deleteConfirm(id: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir categoria?',
        text: 'Deseja realmente excluir a categoria?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Excluir',
        cancelButtonText: 'Cancelar',
      });
      if (!result.isConfirmed) return;

      await api.delete(`/categories/${id}`);
      await this.loadData(1);
    } catch (error) {

    }
  }
}
