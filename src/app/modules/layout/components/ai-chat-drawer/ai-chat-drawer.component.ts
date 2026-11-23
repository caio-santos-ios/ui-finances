import {
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-ai-chat-drawer',
  templateUrl: './ai-chat-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class AiChatDrawerComponent {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField') private inputField!: ElementRef<HTMLTextAreaElement>;

  inputText = '';

  suggestedQuestions = [
    'Qual meu resumo financeiro deste mês?',
    'Como estão meus orçamentos?',
    'Como está minha carteira de investimentos?',
    'Qual o progresso das minhas metas financeiras?',
  ];

  constructor(
    public aiService: AiService,
    private sanitizer: DomSanitizer
  ) {
    effect(() => {
      this.aiService.messages();
      this.aiService.isLoading();
      this.scrollToBottom();
    });

    effect(() => {
      if (this.aiService.isOpen()) {
        setTimeout(() => {
          this.inputField?.nativeElement?.focus();
          this.scrollToBottom();
        }, 150);
      }
    });
  }

  close(): void {
    this.aiService.close();
  }

  clear(): void {
    this.aiService.clearHistory();
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.aiService.isLoading()) return;

    this.inputText = '';
    await this.aiService.sendMessage(text);
  }

  sendSuggestion(suggestion: string): void {
    if (this.aiService.isLoading()) return;
    this.aiService.sendMessage(suggestion);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  formatMarkdown(text: string): SafeHtml {
    if (!text) return '';

    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    formatted = formatted.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold text-foreground">$1</strong>'
    );

    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    formatted = formatted.replace(
      /(?:^|\n)[-*]\s+(.+)/g,
      '<div class="flex items-start gap-2 my-1"><span class="text-violet-400 mt-1 text-[8px]">•</span><span>$1</span></div>'
    );

    formatted = formatted.replace(/\n/g, '<br/>');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
