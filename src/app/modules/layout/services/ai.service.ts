import { Injectable, signal } from '@angular/core';
import { api } from 'src/app/shared/api/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  isOpen = signal<boolean>(false);
  messages = signal<ChatMessage[]>([]);
  isLoading = signal<boolean>(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  clearHistory(): void {
    this.messages.set([]);
  }

  async sendMessage(message: string): Promise<string> {
    const trimmed = message.trim();
    if (!trimmed || this.isLoading()) return '';

    const historyForApi = this.messages().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Adiciona mensagem do usuário ao estado
    this.messages.update((list) => [
      ...list,
      { role: 'user', content: trimmed, timestamp: new Date() },
    ]);

    this.isLoading.set(true);

    try {
      const { data } = await api.post('/ai/chat', {
        message: trimmed,
        history: historyForApi,
      });

      const reply = data?.data || 'Não foi possível obter uma resposta no momento.';
      this.messages.update((list) => [
        ...list,
        { role: 'assistant', content: reply, timestamp: new Date() },
      ]);
      return reply;
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        'Ocorreu uma falha na comunicação com o assistente de IA. Por favor, tente novamente.';
      this.messages.update((list) => [
        ...list,
        { role: 'assistant', content: errorMsg, timestamp: new Date() },
      ]);
      return errorMsg;
    } finally {
      this.isLoading.set(false);
    }
  }
}
