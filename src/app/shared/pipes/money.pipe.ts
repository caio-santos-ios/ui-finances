import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'moneyPipe',
})
export class MoneyPipe implements PipeTransform {
    private formatter = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    transform(value: number | string | null | undefined): string {
        if (value === null || value === undefined || value === '') {
            return 'R$ 0,00';
        }

        const num = typeof value === 'number'
            ? value
            : Number(String(value).replace(/\s/g, '').replace(',', '.'));

        if (isNaN(num)) {
            return 'R$ 0,00';
        }

        return `R$ ${this.formatter.format(num)}`;
    }
}