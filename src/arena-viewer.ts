import { LitElement, PropertyValues, css, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import beerStyles from "beercss/dist/cdn/beer.css?inline";
import Dexie from "dexie";

import { marked } from "marked";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { humanFileSize } from "./utils";

type TResponse = {
  id: string;
  created_at: string;
  eval_count: number;
  eval_duration: number;
  model_family: string;
  load_duration: number;
  message: string;
  model_name: string;
  parameters: string;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  query: string;
  size: number;
  started: string;
  total_duration: number;
  group_id: string;
};

@customElement("arena-viewer")
export class ArenaViewer extends LitElement {
  static styles = [
    css`
      :host {
        font-family: var(--font);
        font-size: 0.875rem;
        line-height: 1.5rem;
        letter-spacing: 0.0313rem;
      }

      button.extra {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
      }
    `,
    unsafeCSS(beerStyles),
  ];

  @property()
  DBName: string = "LLMArenaDatabase";

  @state()
  private _responses: Array<TResponse> = [];

  private _dexie?: Dexie;

  connectedCallback(): void {
    super.connectedCallback();
    document.body.addEventListener("generator:done", () => {
      this._updateList();
    });
  }

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
    this._updateList();
  }

  private async _updateList() {
    this._responses = await this._dexie?.responses.toArray();
  }

  private _exportToExcel() {
    if (!this._responses || this._responses.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = [
      "Family",
      "Model",
      "Parameters",
      "Size",
      "Query",
      "Response",
      "Total Duration",
      "Load Duration",
      "Prompt Eval Token",
      "Prompt Eval Duration",
      "Prompt Eval Token/s",
      "Response Token",
      "Response Duration",
      "Response Token/s",
      "Created",
      "Group",
    ];

    // Helper function to escape values for TSV
    const escapeTSVValue = (value: string | number): string => {
      if (typeof value === "string") {
        return value.replace(/[\t\r\n]/g, " "); // Replace tabs and newlines with spaces
      }
      return value.toString();
    };

    const rows = this._responses.map((result) => [
      escapeTSVValue(result.model_family),
      escapeTSVValue(result.model_name),
      escapeTSVValue(result.parameters),
      escapeTSVValue(humanFileSize(result.size)),
      escapeTSVValue(result.query),
      escapeTSVValue(result.message.replace(/[\r\n]+/g, " ")), // Remove newlines
      escapeTSVValue((result.total_duration / 1000000).toFixed(2)),
      escapeTSVValue((result.load_duration / 1000000).toFixed(2)),
      escapeTSVValue(result.prompt_eval_count),
      escapeTSVValue((result.prompt_eval_duration / 1000000).toFixed(2)),
      escapeTSVValue(
        (
          (result.prompt_eval_count / result.prompt_eval_duration) *
          1000000000
        ).toFixed(2)
      ),
      escapeTSVValue(result.eval_count),
      escapeTSVValue((result.eval_duration / 1000000).toFixed(2)),
      escapeTSVValue(
        ((result.eval_count / result.eval_duration) * 1000000000).toFixed(2)
      ),
      escapeTSVValue(result.created_at),
      escapeTSVValue(result.group_id),
    ]);

    const tsvContent = [
      headers.map(escapeTSVValue).join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");

    // Add BOM to ensure UTF-8 encoding
    const bom = "\uFEFF";
    const blob = new Blob([bom + tsvContent], {
      type: "text/tab-separated-values;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "responses.tsv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  render() {
    return html` <button class="circle extra" @click="${this._exportToExcel}">
        <i>save</i>
      </button>
      ${this._responses.length === 0
        ? html`nothing here`
        : html`<table class="stripes">
            <thead>
              <tr>
                <th>Family</th>
                <th>Model</th>
                <th>Parameters</th>
                <th>Size</th>
                <th>Query</th>
                <th>Total Duration</th>
                <th>Load Duration</th>
                <th>Prompt Eval Token</th>
                <th>Prompt Eval Duration</th>
                <th>Prompt Eval Token/s</th>
                <th>Response Token</th>
                <th>Response Duration</th>
                <th>Response Token/s</th>
                <th>Created</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody>
              ${this._responses.map(
                (result) => html`
                  <tr>
                    <td colspan="15">
                      ${unsafeHTML(marked.parse(result.message))}
                    </td>
                  </tr>
                  <tr>
                    <td style="border-block-end: 2px solid white;">
                      ${result.model_family}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.model_name}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.parameters}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${humanFileSize(result.size)}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.query}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.total_duration / 1000000}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.load_duration / 1000000}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.prompt_eval_count}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.prompt_eval_duration / 1000000}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${(result.prompt_eval_count /
                        result.prompt_eval_duration) *
                      1000000000}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.eval_count}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.eval_duration / 1000000}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${(result.eval_count / result.eval_duration) * 1000000000}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.created_at}
                    </td>
                    <td style="border-block-end: 2px solid white;">
                      ${result.group_id}
                    </td>
                  </tr>
                `
              )}
            </tbody>
          </table>`}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "arena-viewer": ArenaViewer;
  }
}
