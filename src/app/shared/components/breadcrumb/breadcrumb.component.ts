import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [CommonModule],
  templateUrl: './breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './breadcrumb.component.css',
})
export class BreadcrumbComponent {
  @Input() module: string = '';
  @Input() title: string = '';
  @Input() icon: string = '';
  @Input() items: BreadcrumbItem[] = [];

  get displayTitle(): string {
    return this.title || this.module;
  }
}
