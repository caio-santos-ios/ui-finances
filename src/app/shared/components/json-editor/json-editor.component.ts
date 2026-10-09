import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { CompletionContext } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';

const MONGO_WORDS = [
  '$match', '$group', '$sort', '$limit', '$skip', '$project', '$addFields', '$lookup', '$unwind',
  '$sum', '$avg', '$min', '$max', '$first', '$last', '$count', '$push',
  '$convert', '$dateToString', '$dayOfWeek', '$ifNull', '$cond', '$round', '$multiply', '$subtract', '$arrayElemAt',
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$and', '$or',
  '@userId', '@startDate', '@endDate',
];

function mongoCompletions(ctx: CompletionContext) {
  const word = ctx.matchBefore(/"?[$@]\w*/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;

  return {
    from: word.from,
    options: MONGO_WORDS.map((w) => ({
      label: `"${w}"`,
      type: w.startsWith('@') ? 'variable' : 'keyword',
    })),
  };
}

@Component({
  selector: 'app-json-editor',
  template: `<div #host class="overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700"></div>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => JsonEditorComponent), multi: true }],
})
export class JsonEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  private view?: EditorView;
  private value = '';
  private writing = false;
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit() {
    const dark = document.documentElement.classList.contains('dark');

    this.view = new EditorView({
      parent: this.host.nativeElement,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          basicSetup,
          json(),
          linter(jsonParseLinter()),
          lintGutter(),
          EditorState.languageData.of(() => [{ autocomplete: mongoCompletions }]),
          ...(dark ? [oneDark] : []),
          EditorView.theme({
            '&': { height: '260px', fontSize: '12px' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, monospace' },
          }),
          EditorView.updateListener.of((u) => {
            // ignora mudanças vindas do form (writeValue), só avisa as digitadas
            if (u.docChanged && !this.writing) this.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({ blur: () => this.onTouched() }),
        ],
      }),
    });
  }

  writeValue(value: string | null) {
    this.value = value ?? '';

    if (this.view && this.value !== this.view.state.doc.toString()) {
      this.writing = true;
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: this.value },
      });
      this.writing = false;
    }
  }

  registerOnChange(fn: (v: string) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  ngOnDestroy() {
    this.view?.destroy();
  }
}