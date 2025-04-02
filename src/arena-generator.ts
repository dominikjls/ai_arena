import { LitElement, PropertyValues, css, html, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { ChatResponse, Ollama } from "ollama";
import { createRef, Ref, ref } from "lit/directives/ref.js";

import beerStyles from "beercss/dist/cdn/beer.css?inline";
import Dexie from "dexie";
import { humanFileSize } from "./utils";

type TLLM = {
  name: string;
  parameters: string;
  size: number;
  family: string;
  selected: boolean;
};

@customElement("arena-generator")
export class ArenaGenerator extends LitElement {
  static styles = [
    css`
      :host {
        font-family: var(--font);
        font-size: 0.875rem;
        line-height: 1.5rem;
        letter-spacing: 0.0313rem;
      }
    `,
    unsafeCSS(beerStyles),
  ];

  @state()
  private _llm: Array<TLLM> = [];

  @state()
  private _results: Array<
    ChatResponse & { query: string; startet: string } & TLLM
  > = [];

  @state()
  private _running: boolean = false;

  @state()
  private _selectedLLM: any;

  @property()
  LLMhost: string = "http://localhost:11434";

  @property()
  DBName: string = "LLMArenaDatabase";

  inputRef: Ref<HTMLInputElement> = createRef();

  private _ollamaInstance?: Ollama;

  private _dexie?: Dexie;

  protected async firstUpdated(_changedProperties: PropertyValues) {
    this._dexie = new Dexie(this.DBName);
    this._dexie.version(1).stores({
      responses: `
        id++,
        created_at,
        eval_count,
        eval_duration,
        model_family,
        load_duration,
        message,
        model_name,
        parameters,
        prompt_eval_count,
        prompt_eval_duration,
        query,
        size,
        started,
        total_duration
      `,
    });

    try {
      this._ollamaInstance = new Ollama({ host: this.LLMhost });
      const { models } = await this._ollamaInstance.list();

      this._llm = models.map((model) => ({
        name: model.name,
        parameters: model.details.parameter_size,
        size: model.size,
        family: model.details.family,
        selected: false,
      }));
    } catch (error) {
      console.error("Error checking model availability:", error);
      return Promise.reject(new Error("Model not available"));
    }
  }

  private async _handleClick() {
    if (!this._ollamaInstance) return;

    const uuid = self.crypto.randomUUID();

    let counter = 0;

    this._selectedLLM = this._llm.filter((llm) => llm.selected);

    this._running = true;

    const queryInput = this.inputRef.value?.value ?? "";

    this._selectedLLM.forEach(async (llm: any) => {
      const response = await this._ollamaInstance?.chat({
        model: llm.name,
        messages: [{ role: "user", content: queryInput }],
      });
      counter += 1;
      if (!response) return;
      this._results.push({
        ...response,
        ...llm,
        query: queryInput,
        started: new Date().toISOString(),
      });

      await this._dexie?.responses.add({
        created_at: response.created_at,
        eval_count: response.eval_count,
        eval_duration: response.eval_duration,
        model_family: llm.family,
        load_duration: response.load_duration,
        message: response.message.content,
        model_name: llm.name,
        parameters: llm.parameters,
        prompt_eval_count: response.prompt_eval_count,
        prompt_eval_duration: response.prompt_eval_duration,
        query: queryInput,
        size: llm.size,
        started: new Date().toISOString(),
        total_duration: response.total_duration,
        group_id: uuid,
      });

      if (this._selectedLLM.length === counter) {
        this._running = false;
      }

      this.dispatchEvent(
        new CustomEvent("generator:done", { bubbles: true, composed: true })
      );

      this.requestUpdate();
    });
  }

  render() {
    return html`
      <ul class="list border" style="overflow:auto">
        ${this._llm.length === 0
          ? html`<li>nothing here</li>`
          : this._llm.map(
              (llm, idx) =>
                html`<li>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      ?selected=${llm.selected}
                      @change=${() => {
                        this._llm[idx].selected = !this._llm[idx].selected;
                      }}
                    />
                    <span
                      >${llm.name} ${llm.parameters}
                      (${humanFileSize(llm.size)})</span
                    ></label
                  >
                </li>`
            )}
      </ul>
      <div class="field prefix border round">
        <i class="front">chat</i>
        <input type="text" ${ref(this.inputRef)} />
        ${this._running ? html`<progress class="circle"></progress>` : nothing}
      </div>
      <button type="button" @click=${this._handleClick}>
        ${this._running
          ? html`<progress
              class="max light-green-text"
              value="${(this._results.length * 100) / this._selectedLLM.length}"
              max="100"
            ></progress>`
          : nothing}
        <span>Run Message</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "arena-generator": ArenaGenerator;
  }
}
