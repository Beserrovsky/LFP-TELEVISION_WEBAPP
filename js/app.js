import {
  createFakeSubmission,
  validateSubmission,
  computeStats,
  escapeHtml,
  buildQuestions,
  visualisationDefinitions,
  questionTemplates,
  formatAnswer,
  normaliseState,
  normaliseSubmissionPacket
} from "./data.js";

import { loadState, saveState } from "./storage.js";
import { connectSerial, disconnectSerial, sendSerialLine, isSerialSupported } from "./serial.js";
import { startAquarium } from "./aquarium.js";
import { startAsciiAquarium } from "./ascii-aquarium.js";
import { startSandArt } from "./sand.js";
import { startTree } from "./tree.js";
import { startVisualisationOne } from "./visualisation-1.js";
import { startVisualisationTwo } from "./visualisation-2.js";
import { startVisualisationThree } from "./visualisation-3.js";
import { startVisualisationFour } from "./visualisation-4.js";

let state = normaliseState(loadState());
let cleanupCurrentView = null;

const app = document.querySelector("#app");
const setupSteps = [
  "Session details",
  "Questions",
  "Public experience",
  "Connect devices",
  "Go live"
];
const operatorTemplateIds = ["scale5", "likert", "nps", "choice", "short_text"];
const GOOGLE_FORMS_SCOPE = "https://www.googleapis.com/auth/forms.body.readonly";
const GOOGLE_FORMS_CLIENT_ID_STORAGE_KEY = "jj_google_forms_client_id";
const GOOGLE_FORMS_API_BASE = "https://forms.googleapis.com/v1/forms";
const visualisationStarters = {
  vis1: startAquarium,
  vis2: startSandArt,
  vis3: startTree,
  vis4: startVisualisationOne,
  vis5: startVisualisationTwo,
  vis6: startVisualisationThree,
  vis7: startVisualisationFour,
  vis8: startAsciiAquarium
};
const visualisationRoutes = Object.keys(visualisationStarters);

if (!location.hash) {
  history.replaceState(null, "", "#/setup");
}

window.addEventListener("hashchange", render);

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const href = link.getAttribute("href");
    if (!href) return;
    if (location.hash === href) render();
    else location.hash = href;
  });
});

render();

function render() {
  if (cleanupCurrentView) {
    cleanupCurrentView();
    cleanupCurrentView = null;
  }

  state = normaliseState(state);
  if (sanitiseOperatorQuestions()) {
    saveState(state);
  }
  const route = getRoute();
  const isGroupRoute = route === "group" || visualisationRoutes.includes(route);

  document.body.classList.toggle("group-mode", isGroupRoute);
  setActiveNav();
  renderReadinessIndicators();

  if (route === "results" || route === "monitor") renderResults();
  else if (route === "advanced") renderAdvancedPage();
  else if (route === "group") cleanupCurrentView = startGroupScreen();
  else if (visualisationStarters[route]) cleanupCurrentView = startVisualScreen(() => visualisationStarters[route](app, state));
  else renderSetup();
}

function renderSetup() {
  ensureSetupDefaults();
  const step = clamp(Number(state.meta.setupStep || 0), 0, setupSteps.length - 1);
  state.meta.setupStep = clamp(step, 0, highestAccessibleStep());
  const activeStep = state.meta.setupStep;
  const progress = Math.round((setupSteps.filter((_, index) => isSetupStepComplete(index)).length / setupSteps.length) * 100);

  app.innerHTML = `
    <section class="operator-page">
      <aside class="setup-rail">
        <div class="brand-card">
          <div class="brand-dot"></div>
          <div>
            <h2>Small group engagement demo</h2>
            <p>Meeting-ready setup for a small group.</p>
          </div>
        </div>
        <div class="progress-card">
          <div>
            <span>${progress}% ready</span>
            <strong>${escapeHtml(setupSteps[activeStep])}</strong>
          </div>
          <div class="progress-track"><i style="width:${progress}%"></i></div>
        </div>
        <ol class="step-list">
          ${setupSteps.map((label, index) => `
            <li class="${index === activeStep ? "active" : ""} ${isSetupStepComplete(index) ? "done" : ""} ${canAccessStep(index) ? "" : "locked"}">
              <button type="button" data-go-step="${index}" ${canAccessStep(index) ? "" : "disabled"}>
                <span>${isSetupStepComplete(index) ? "&#10003;" : index + 1}</span>
                ${escapeHtml(label)}
              </button>
            </li>
          `).join("")}
        </ol>
      </aside>

      <div class="setup-main">
        <section class="console-zone" aria-label="Operator Console">
          <div class="zone-title">
            <span>Operator Console</span>
            <strong>${escapeHtml(setupSteps[activeStep])}</strong>
          </div>
          ${renderSetupStep(activeStep)}
        </section>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-go-step]").forEach((button) => {
    button.addEventListener("click", () => {
      persistCurrentStep();
      const requestedStep = Number(button.dataset.goStep);
      if (requestedStep < Number(state.meta.setupStep || 0)) {
        clearSetupCompletionsFrom(requestedStep);
      }
      state.meta.setupStep = canAccessStep(requestedStep) ? requestedStep : highestAccessibleStep();
      saveAndRender();
    });
  });

  wireSetupStep(activeStep);
}

function startGroupScreen() {
  const starter = visualisationStarters[state.settings.activeVis] || startAquarium;
  return startVisualScreen(() => starter(app, state));
}

function startVisualScreen(start) {
  state.meta.publicScreenOnline = true;
  saveState(state);
  const cleanup = start();
  addGroupBackLink();

  return () => {
    document.querySelector(".group-back-link")?.remove();
    cleanup?.();
  };
}

function addGroupBackLink() {
  const link = document.createElement("a");
  link.className = "group-back-link";
  link.href = "#/setup";
  link.textContent = "Back to setup";
  document.body.appendChild(link);
}

function renderSetupStep(step) {
  if (step === 0) return renderWelcomeStep();
  if (step === 1) return renderSurveyStep();
  if (step === 2) return renderMomentStep();
  if (step === 3) return renderReceiverStep();
  return renderLaunchStep();
}

function renderRecommendedSetupCard() {
  return `
    <article class="recommended-card">
      <div>
        <p class="small-label">Recommended quick setup</p>
        <h3>Meeting-safe default</h3>
        <ul>
          <li>Anonymous feedback</li>
          <li>Aquarium visualisation</li>
          <li>Standard questions enabled</li>
          <li>Names hidden from the public screen</li>
        </ul>
      </div>
      <button id="useRecommendedSetup" type="button" class="primary">Use recommended setup</button>
    </article>
  `;
}

function renderWelcomeStep() {
  return `
    <div class="panel hero-panel">
      <p class="small-label">Session details</p>
      <h1>Prepare a guided session before people arrive.</h1>
      <p class="lead">Name the session, choose how participant names are collected, and decide what can appear on the public screen. Private answers stay in the operator console.</p>

      <div class="form-grid two">
        <div class="span-2">
          <label for="sessionName">Session name</label>
          <input id="sessionName" value="${escapeHtml(state.settings.sessionName)}" placeholder="Morning feedback session" />
        </div>
        <div>
          <label>Data collection</label>
          <label class="switch-line">
            <input id="optionalName" type="checkbox" ${state.settings.optionalName ? "checked" : ""} />
            <span>Collect participant first name</span>
          </label>
        </div>
        <div>
          <label>Public screen names</label>
          <select id="publicNames">
            <option value="anonymous" ${state.settings.showNames ? "" : "selected"}>Anonymous only</option>
            <option value="firstNames" ${state.settings.showNames ? "selected" : ""}>Show first names</option>
          </select>
        </div>
      </div>
    </div>
    ${renderRecommendedSetupCard()}
    ${setupFooter("", "Continue to Question Setup ->", true)}
  `;
}

function renderSurveyStep() {
  const questions = state.settings.coreQuestions || [];
  const googleClientId = localStorage.getItem(GOOGLE_FORMS_CLIENT_ID_STORAGE_KEY) || "";

  return `
    <div class="panel">
      <p class="small-label">Questions</p>
      <h1>Review the questions participants will answer.</h1>
      <p class="lead">Import from the Google Forms API or upload a response CSV, then review the editable internal question set before sending it to the ESP32 input devices.</p>

      <div class="import-stack">
        <div class="import-box">
          <div>
            <label for="googleFormUrl">Google Form edit link or form ID</label>
            <input id="googleFormUrl" value="${escapeHtml(state.meta.googleFormUrl || "")}" placeholder="https://docs.google.com/forms/d/..." />
          </div>
          <button id="importGoogleForm" type="button" class="primary">Authenticate and import</button>
        </div>
        <div class="import-box">
          <div>
            <label for="googleClientId">Google OAuth client ID</label>
            <input id="googleClientId" value="${escapeHtml(googleClientId)}" placeholder="1234567890-abc.apps.googleusercontent.com" />
            <p class="field-help">Use a Web application OAuth client with the Google Forms API enabled. The app requests read-only form body access.</p>
          </div>
        </div>

        <div class="import-box">
          <div>
            <label for="csvFile">Google Forms response CSV fallback</label>
            <input id="csvFile" type="file" accept=".csv,text/csv" />
          </div>
          <button id="importCsv" type="button">Import CSV</button>
        </div>
      </div>

      ${state.meta.importNote ? `<div class="notice">${escapeHtml(state.meta.importNote)}</div>` : ""}
    </div>

    <div class="question-list">
      ${questions.map(renderSurveyQuestionEditor).join("")}
    </div>

    <div class="toolbar">
      <button id="addQuestion" type="button">Add question</button>
    </div>

    ${setupFooter("Back", "Continue to Public Experience ->", true)}
  `;
}

function renderSurveyQuestionEditor(question, index) {
  const selectedTemplate = normaliseOperatorTemplate(question.template);
  const editableOptions = getEditableOptions(question, selectedTemplate);
  const showOptions = selectedTemplate === "choice" || selectedTemplate === "likert";
  const typeDetails = question.googleQuestionType
    ? `Imported from Google Forms as ${question.googleQuestionType}.`
    : question.imported
      ? "Imported question."
      : "";

  return `
    <article class="panel question-editor" data-question-index="${index}">
      <div class="question-head">
        <div>
          <p class="small-label">Question ${index + 1}</p>
          <h3>${escapeHtml(question.label || `Question ${index + 1}`)}</h3>
        </div>
        <button type="button" class="ghost danger-text" data-remove-question="${index}">Remove</button>
      </div>

      <div class="form-grid">
        <div class="span-2">
          <label for="qLabel${index}">Question text</label>
          <input id="qLabel${index}" data-field="label" value="${escapeHtml(question.label)}" />
        </div>
        <div>
          <label for="qTemplate${index}">Type</label>
          <select id="qTemplate${index}" data-field="template">
            ${operatorTemplateIds.map((id) => `
              <option value="${escapeHtml(id)}" ${selectedTemplate === id ? "selected" : ""}>${escapeHtml(questionTemplates[id].label)}</option>
            `).join("")}
          </select>
          ${typeDetails ? `<p class="field-help">${escapeHtml(typeDetails)}</p>` : ""}
        </div>
        <div>
          <label>Required</label>
          <label class="switch-line">
            <input type="checkbox" data-field="required" ${question.required === false ? "" : "checked"} />
            <span>Required by default</span>
          </label>
        </div>
        <div class="span-4 option-editor ${showOptions ? "" : "hidden"}">
          <label for="qOptions${index}">Answer options</label>
          <textarea id="qOptions${index}" data-field="options" placeholder="One option per line">${escapeHtml(editableOptions.join("\n"))}</textarea>
        </div>
      </div>
    </article>
  `;
}

function renderMomentStep() {
  const entries = Object.entries(visualisationDefinitions);

  return `
    <div class="panel">
      <p class="small-label">Audience experience</p>
      <h1>Pick what the group will see.</h1>
      <p class="lead">Aquarium is the default public experience for meetings. Each completed response adds exactly one fish.</p>
    </div>
    <div class="moment-grid">
      ${entries.map(([id, def]) => `
        <button type="button" class="moment-card ${state.settings.activeVis === id ? "selected" : ""}" data-moment="${escapeHtml(id)}">
          <span>${id === "vis1" ? "Recommended" : "Optional"}</span>
          <strong>${escapeHtml(engagementTitle(def.title))}</strong>
          <small>${escapeHtml(def.description)}</small>
        </button>
      `).join("")}
    </div>
    ${setupFooter("Back", "Continue to Connect Devices ->", true)}
  `;
}

function renderReceiverStep() {
  const connected = Boolean(state.meta.serialConnected);

  return `
    <div class="panel">
      <p class="small-label">Connect hardware</p>
      <h1>Connect the meeting hardware and send the questions.</h1>
      <p class="lead">Pair the meeting hardware, send the question set, then keep this operator console private while the public screen runs separately.</p>

      <div class="status-strip">
        <span class="status-dot ${connected ? "ok" : "warn"}"></span>
        <strong>${connected ? "Hardware connected" : "Hardware not connected"}</strong>
      </div>

      <div class="toolbar">
        <button id="connectSerial" type="button" class="primary" ${isSerialSupported() ? "" : "disabled"}>Connect hardware</button>
        <button id="sendQuestions" type="button">Send question set</button>
        <button id="disconnectSerial" type="button">Disconnect</button>
      </div>

      ${state.meta.lastSendNote ? `<div class="notice">${escapeHtml(state.meta.lastSendNote)}</div>` : ""}
      ${renderSerialTroubleshooting()}
    </div>
    ${setupFooter("Back", "Continue to Go Live ->", true)}
  `;
}

function renderLaunchStep() {
  const questions = buildQuestions(state.settings);
  const stats = computeStats(state.responses, state.settings);

  return `
    <div class="panel hero-panel">
      <p class="small-label">Go live</p>
      <h1>Ready for the meeting.</h1>
      <p class="lead">Open the selected public screen on the display. Responses will persist locally until the session is reset.</p>
      <div class="metric-row">
        ${metric("Questions", questions.length)}
        ${metric("Responses", stats.count)}
        ${metric("Audience experience", engagementTitle(visualisationDefinitions[state.settings.activeVis]?.title || "Aquarium"))}
      </div>
      <div class="toolbar">
        <a href="#/group"><button class="primary" type="button">Start session</button></a>
        <a href="#/results"><button type="button">Open live results</button></a>
        <button type="button" data-run-demo-responses>Run demo responses</button>
        <button id="resetSession" type="button" class="danger">Reset session data</button>
      </div>
    </div>
    <div class="panel">
      <h3>Final question set</h3>
      ${renderQuestionPreviewTable(questions)}
    </div>
    ${setupFooter("Back", "", false)}
  `;
}

function setupFooter(backLabel, nextLabel, showNext) {
  return `
    <div class="setup-footer">
      ${backLabel ? `<button id="prevStep" type="button">${escapeHtml(backLabel)}</button>` : `<span></span>`}
      ${showNext ? `<button id="nextStep" class="primary wide-cta" type="button">${escapeHtml(nextLabel)}</button>` : `<span></span>`}
    </div>
  `;
}

function wireSetupStep(step) {
  document.querySelector("#nextStep")?.addEventListener("click", () => moveStep(1));
  document.querySelector("#prevStep")?.addEventListener("click", () => moveStep(-1));
  document.querySelector("#resetSession")?.addEventListener("click", resetCurrentSession);
  document.querySelector("#useRecommendedSetup")?.addEventListener("click", useRecommendedSetup);
  document.querySelectorAll("[data-run-demo-responses]").forEach((button) => {
    button.addEventListener("click", runDemoResponses);
  });

  if (step === 1) {
    document.querySelector("#importCsv")?.addEventListener("click", importCsvFromFile);
    document.querySelector("#importGoogleForm")?.addEventListener("click", importGoogleFormFromApi);
    document.querySelector("#addQuestion")?.addEventListener("click", () => {
      readSurveyEditorIntoState();
      const next = state.settings.coreQuestions.length + 1;
      state.settings.coreQuestions.push({
        id: `q${next}`,
        label: `Question ${next}`,
        template: "scale5",
        required: true
      });
      saveAndRender();
    });

    document.querySelectorAll("[data-remove-question]").forEach((button) => {
      button.addEventListener("click", () => {
        readSurveyEditorIntoState();
        const index = Number(button.dataset.removeQuestion);
        state.settings.coreQuestions.splice(index, 1);
        reindexCoreQuestions();
        saveAndRender();
      });
    });

    document.querySelectorAll(".question-editor input, .question-editor select, .question-editor textarea").forEach((control) => {
      control.addEventListener("change", () => {
        readSurveyEditorIntoState();
        saveState(state);
        renderSetup();
      });
    });

    document.querySelector("#googleClientId")?.addEventListener("change", (event) => {
      localStorage.setItem(GOOGLE_FORMS_CLIENT_ID_STORAGE_KEY, event.target.value.trim());
    });

    document.querySelector("#googleFormUrl")?.addEventListener("change", (event) => {
      state.meta.googleFormUrl = event.target.value.trim();
      saveState(state);
    });
  }

  if (step === 2) {
    document.querySelectorAll("[data-moment]").forEach((button) => {
      button.addEventListener("click", () => {
        state.settings.activeVis = button.dataset.moment;
        saveAndRender();
      });
    });
  }

  if (step === 3) {
    document.querySelector("#connectSerial")?.addEventListener("click", connectToSerial);
    document.querySelector("#disconnectSerial")?.addEventListener("click", disconnectFromSerial);
    document.querySelector("#sendQuestions")?.addEventListener("click", sendQuestionsToReceiver);
  }
}

function moveStep(delta) {
  persistCurrentStep();
  const currentStep = Number(state.meta.setupStep || 0);

  if (delta > 0) {
    markSetupStepComplete(currentStep);
    state.meta.setupStep = clamp(currentStep + delta, 0, highestAccessibleStep());
  } else {
    const nextStep = clamp(currentStep + delta, 0, setupSteps.length - 1);
    clearSetupCompletionsFrom(nextStep);
    state.meta.setupStep = nextStep;
  }

  saveAndRender();
}

function isSetupStepComplete(index) {
  return Boolean(state.meta.setupCompleted?.[index]);
}

function canAccessStep(index) {
  return index <= highestAccessibleStep();
}

function highestAccessibleStep() {
  const completed = state.meta.setupCompleted || {};
  let highest = 0;

  for (let index = 0; index < setupSteps.length - 1; index += 1) {
    if (!completed[index]) break;
    highest = index + 1;
  }

  return highest;
}

function markSetupStepComplete(index) {
  state.meta.setupCompleted = {
    ...(state.meta.setupCompleted || {}),
    [index]: true
  };
}

function clearSetupCompletionsFrom(index) {
  const completed = { ...(state.meta.setupCompleted || {}) };

  for (let i = index; i < setupSteps.length; i += 1) {
    delete completed[i];
  }

  state.meta.setupCompleted = completed;
}

function persistCurrentStep() {
  const step = Number(state.meta.setupStep || 0);

  if (step === 0) {
    const sessionNameInput = document.querySelector("#sessionName");
    const optionalNameInput = document.querySelector("#optionalName");
    const publicNamesInput = document.querySelector("#publicNames");
    state.settings.sessionName = sessionNameInput?.value.trim() || state.settings.sessionName;
    state.settings.optionalName = Boolean(optionalNameInput?.checked);
    state.settings.showNames = publicNamesInput?.value === "firstNames";
  }

  if (step === 1) {
    readSurveyEditorIntoState();
  }
}

function renderResults() {
  const questions = buildQuestions(state.settings);
  const stats = computeStats(state.responses, state.settings);
  const pairedDevices = getPairedDeviceCount();
  const lastResponse = getLastResponse(state.responses);

  app.innerHTML = `
    <section class="operator-page single live-dashboard">
      <div class="page-header dashboard-header">
        <div>
          <p class="small-label">Private dashboard</p>
          <h1>Live response dashboard</h1>
          <p class="lead">Operator only. Private answers and participant names are not shown on the public screen.</p>
        </div>
        <div class="toolbar compact">
          <button id="exportCsv" type="button" class="primary">Export CSV</button>
          <button type="button" data-run-demo-responses>Run demo responses</button>
          <a href="#/group"><button type="button">Public Screen</button></a>
        </div>
      </div>

      <div class="live-overview">
        <article class="panel session-summary">
          <div>
            <p class="small-label">Session status</p>
            <h2>${escapeHtml(stats.count ? "Session running" : "Waiting for responses")}</h2>
            <p>${escapeHtml(lastResponse ? `Last response received ${formatRelativeTime(lastResponse)}.` : "Waiting for the first completed response.")}</p>
          </div>
          <div class="summary-metrics">
            ${metric("Responses", stats.count)}
            ${metric("Questions", questions.length)}
            ${metric("Session", state.settings.sessionName)}
          </div>
        </article>

        <article class="panel system-status-panel">
          <div class="section-head">
            <div>
              <p class="small-label">System Status</p>
              <h3>Meeting readiness</h3>
            </div>
          </div>
          <div class="system-status-grid">
            ${renderStatusCard("Hardware", state.meta.serialConnected ? "Connected" : "Disconnected", state.meta.serialConnected ? "ok" : "bad", state.meta.serialConnected ? "Ready to receive submissions." : "Connect the ESP32 receiver before going live.")}
            ${renderStatusCard("Paired devices", String(pairedDevices), pairedDevices > 0 ? "ok" : "warn", pairedDevices > 0 ? "Devices have submitted responses." : "No devices have submitted yet.")}
            ${renderStatusCard("Public screen", state.meta.publicScreenOnline ? "Online" : "Not open", state.meta.publicScreenOnline ? "ok" : "warn", state.meta.publicScreenOnline ? "Audience display is running." : "Open the public screen before the session starts.")}
          </div>
        </article>
      </div>

      <div class="facilitator-cue ${stats.count ? "active" : "waiting"}">
        <strong>${escapeHtml(stats.count ? "Live cue" : "Waiting")}</strong>
        <span>${escapeHtml(getFacilitatorCue(stats.count, lastResponse))}</span>
      </div>

      <div class="dashboard-section-head">
        <div>
          <p class="small-label">Live analytics</p>
          <h2>Question summary</h2>
        </div>
      </div>
      <div class="result-grid">
        ${questions.map((q) => renderQuestionReadout(q, stats)).join("")}
      </div>

      <details class="panel raw-response-panel">
        <summary>
          <span>View raw responses</span>
          <small>For debugging, export checks, and device troubleshooting</small>
        </summary>
        <div class="raw-response-content">
          <div class="section-head">
            <h3>Raw response table</h3>
            <button id="clearSession" type="button" class="danger">Reset session data</button>
          </div>
          ${renderResponseTable()}
        </div>
      </details>
    </section>
  `;

  document.querySelector("#exportCsv")?.addEventListener("click", exportCsv);
  document.querySelector("#clearSession")?.addEventListener("click", resetCurrentSession);
  document.querySelectorAll("[data-run-demo-responses]").forEach((button) => {
    button.addEventListener("click", runDemoResponses);
  });
}

function renderAdvancedPage() {
  app.innerHTML = `
    <section class="operator-page single">
      <div class="page-header">
        <div>
          <p class="small-label">Advanced</p>
          <h1>Technical controls</h1>
          <p class="lead">Hardware controls, simulation, duplicate warnings, and serial logs for setup and troubleshooting.</p>
        </div>
        <div class="toolbar compact">
          <a href="#/results"><button type="button">Live Results</button></a>
          <a href="#/setup"><button type="button">Setup</button></a>
        </div>
      </div>

      <div class="panel">
        ${renderAdvancedControls()}
      </div>
    </section>
  `;

  document.querySelector("#fakeSubmission")?.addEventListener("click", addFakeSubmission);
  document.querySelectorAll("[data-run-demo-responses]").forEach((button) => {
    button.addEventListener("click", runDemoResponses);
  });
  document.querySelector("#connectSerialAdvanced")?.addEventListener("click", connectToSerial);
  document.querySelector("#disconnectSerialAdvanced")?.addEventListener("click", disconnectFromSerial);
  document.querySelector("#sendQuestionsAdvanced")?.addEventListener("click", sendQuestionsToReceiver);
  scrollSerialLogToBottom();
}

function renderQuestionReadout(question, stats) {
  const qStats = stats.questionStats[question.id] || {};
  const title = analyticsTitle(question);
  const typeLabel = analyticsTypeLabel(question);

  if (question.kind === "scale" || question.kind === "nps") {
    const primary = question.kind === "nps" ? qStats.nps ?? "0" : qStats.average ?? "0.00";
    const primaryLabel = question.kind === "nps" ? "NPS score" : "Average score";

    return `
      <article class="panel result-card analytics-card">
        <p class="small-label">${escapeHtml(typeLabel)}</p>
        <h3>${escapeHtml(title)}</h3>
        <div class="readout-main">
          <strong>${escapeHtml(primary)}</strong>
          <span>${escapeHtml(primaryLabel)}</span>
        </div>
        ${renderDistribution(qStats.distribution || {}, { total: qStats.count || 0 })}
      </article>
    `;
  }

  if (question.kind === "likert" || question.kind === "choice") {
    const counts = question.kind === "choice"
      ? normaliseChoiceCounts(stats.choiceCounts[question.id] || {}, question)
      : qStats.distribution || {};
    const total = Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);

    return `
      <article class="panel result-card analytics-card">
        <p class="small-label">${escapeHtml(typeLabel)}</p>
        <h3>${escapeHtml(title)}</h3>
        ${renderCounts(counts, { total })}
      </article>
    `;
  }

  return `
    <article class="panel result-card analytics-card">
      <p class="small-label">${escapeHtml(typeLabel)}</p>
      <h3>${escapeHtml(title)}</h3>
      <p class="privacy-note">Recent entries are private and visible only to the operator.</p>
      <div class="text-response-list">
        ${(qStats.recent || []).map((value) => `<blockquote>${escapeHtml(value)}</blockquote>`).join("") || "<p>No responses yet.</p>"}
      </div>
    </article>
  `;
}

function renderAdvancedControls() {
  const duplicates = findDuplicateSubmissionIds();

  return `
    <div class="advanced-grid">
      <div>
        <h3>Hardware controls</h3>
        <div class="toolbar">
          <button id="connectSerialAdvanced" type="button" ${isSerialSupported() ? "" : "disabled"}>Connect hardware</button>
          <button id="sendQuestionsAdvanced" type="button">Send question set</button>
          <button id="disconnectSerialAdvanced" type="button">Disconnect</button>
          <button id="fakeSubmission" type="button">Simulate response</button>
          <button type="button" data-run-demo-responses>Run demo responses</button>
        </div>
        ${renderSerialTroubleshooting()}
      </div>
      <div>
        <h3>Duplicate warnings</h3>
        ${duplicates.length ? duplicates.map((id) => `<p class="field-warning">${escapeHtml(id)}</p>`).join("") : "<p>No duplicate submissions stored.</p>"}
      </div>
    </div>
    <h3>Serial / debug log</h3>
    <div class="log">${escapeHtml(state.logs.slice(-100).join("\n"))}</div>
  `;
}

function scrollSerialLogToBottom() {
  const log = document.querySelector(".log");
  if (log) log.scrollTop = log.scrollHeight;
}

function processIncomingSubmission(packet, source = "unknown") {
  let parsed = packet;

  if (typeof packet === "string") {
    const trimmedLine = packet.trim();

    if (!trimmedLine.startsWith("{")) {
      addLog(`IGNORED SERIAL LINE: ${trimmedLine}`);
      return;
    }

    try {
      parsed = JSON.parse(trimmedLine);
    } catch (error) {
      addLog(`ERROR: Could not parse serial JSON: ${trimmedLine}`);
      return;
    }
  }

  parsed = normaliseSubmissionPacket(parsed);

  if (parsed?.type !== "SUBMISSION") {
    addLog(`IGNORED JSON LINE: ${parsed?.type || "unknown"}`);
    return;
  }

  const validation = validateSubmission(parsed, state.settings);

  if (!validation.ok) {
    addLog(`REJECTED: ${validation.errors.join("; ")}`);
    return;
  }

  const duplicate = state.responses.some((r) => r.submission_id === parsed.submission_id);

  if (duplicate) {
    addLog(`DUPLICATE IGNORED: ${parsed.submission_id}`);
    saveAndRender();
    return;
  }

  state.responses.push({
    ...parsed,
    source,
    received_at: new Date().toISOString()
  });

  addLog(`RECEIVED: ${parsed.submission_id} from device ${parsed.device_id}`);
  saveAndRender();
}

function addFakeSubmission() {
  state.meta.fakeCounter = Number(state.meta.fakeCounter || 0) + 1;
  const fake = createFakeSubmission(state, state.meta.fakeCounter);
  processIncomingSubmission(fake, "simulated");
}

function runDemoResponses() {
  persistCurrentStep();

  for (let i = 0; i < 8; i += 1) {
    state.meta.fakeCounter = Number(state.meta.fakeCounter || 0) + 1;
    const fake = createFakeSubmission(state, state.meta.fakeCounter);
    const validation = validateSubmission(fake, state.settings);

    if (!validation.ok || state.responses.some((r) => r.submission_id === fake.submission_id)) continue;

    state.responses.push({
      ...fake,
      source: "demo",
      received_at: new Date(Date.now() - ((7 - i) * 9000)).toISOString()
    });
  }

  addLog("Demo responses added for meeting rehearsal.");
  saveAndRender();
}

function useRecommendedSetup() {
  state.settings.optionalName = true;
  state.settings.showNames = false;
  state.settings.activeVis = "vis1";
  state.settings.coreQuestions = [
    {
      id: "q1",
      label: "Rate J&J on innovation",
      template: "scale5",
      required: true
    },
    {
      id: "q2",
      label: "Satisfaction with J&J interactions",
      template: "choice",
      options: ["Yes", "No"],
      required: true
    },
    {
      id: "q3",
      label: "Recommend J&J to a colleague?",
      template: "nps",
      required: true
    }
  ];
  addLog("Recommended quick setup applied.");
  saveAndRender();
}

async function connectToSerial() {
  try {
    await connectSerial({
      onLine: (line) => {
        addLog(`SERIAL LINE: ${line}`);
        processIncomingSubmission(line, "serial");
      },
      onStatus: (message) => {
        state.meta.serialConnected = message.toLowerCase().includes("connected");
        state.meta.serialError = "";
        addLog(message);
        saveAndRender();
      },
      onError: (error) => {
        state.meta.serialConnected = false;
        state.meta.serialError = error.message || String(error);
        addLog(`SERIAL ERROR: ${state.meta.serialError}`);
        saveAndRender();
      }
    });

    state.meta.serialConnected = true;
    state.meta.serialError = "";
    saveAndRender();
  } catch (error) {
    state.meta.serialConnected = false;
    state.meta.serialError = error.message || String(error);
    addLog(`SERIAL CONNECT FAILED: ${state.meta.serialError}`);
    saveAndRender();
  }
}

async function disconnectFromSerial() {
  await disconnectSerial();
  state.meta.serialConnected = false;
  addLog("Serial disconnect requested.");
  saveAndRender();
}

async function sendQuestionsToReceiver() {
  persistCurrentStep();
  const questions = buildQuestions(state.settings);
  const validation = validateQuestionSetForSend(questions);

  if (validation.length) {
    const message = `Question set needs review:\n\n${validation.join("\n")}`;
    alert(message);
    addLog(`QUESTION_SET blocked: ${validation.join("; ")}`);
    saveAndRender();
    return;
  }

  const confirmed = confirm(buildSendConfirmationMessage(questions));
  if (!confirmed) {
    addLog("QUESTION_SET send cancelled during sales rep confirmation.");
    saveAndRender();
    return;
  }

  const payload = {
    type: "QUESTION_SET",
    session_id: String(state.settings.sessionId),
    activeVis: state.settings.activeVis,
    optionalName: state.settings.optionalName,
    showNames: state.settings.showNames,
    question_count: questions.length,
    questions
  };

  questions.slice(0, 3).forEach((q, index) => {
    const num = index + 1;
    payload[`q${num}_kind`] = q.kind;
    payload[`q${num}_min`] = q.min ?? 1;
    payload[`q${num}_max`] = q.max ?? (Array.isArray(q.options) ? q.options.length : 5);
    payload[`q${num}_option_count`] = Array.isArray(q.options) ? q.options.length : 0;
  });

  try {
    await sendSerialLine(JSON.stringify(payload));
    addLog(`QUESTION_SET sent to receiver with ${questions.length} questions.`);
    state.meta.lastQuestionSetSentAt = new Date().toISOString();
    state.meta.lastSendNote = `Sent ${questions.length} questions to ESP32 input devices.`;
    alert(`Question set sent to ESP32 input devices.\n\n${questions.length} questions synced.`);
  } catch (error) {
    const message = error.message || String(error);
    state.meta.lastSendNote = `Send failed: ${message}`;
    addLog(`QUESTION_SET not sent: ${message}`);
    alert(`Question set was not sent.\n\n${message}`);
  }

  saveAndRender();
}

function resetCurrentSession() {
  const confirmed = confirm("Reset this session? All responses and group screen items will be cleared.");
  if (!confirmed) return;

  state.responses = [];
  state.logs = [];
  state.meta.fakeCounter = 0;
  state.meta.publicScreenOnline = false;
  state.meta.setupCompleted = {};
  state.meta.setupStep = 0;
  addLog("Session data reset. Responses and group screen items cleared.");
  saveAndRender();
}

function exportCsv() {
  const questions = buildQuestions(state.settings);
  const header = [
    "received_at",
    "source",
    "session_id",
    "device_id",
    "submission_id",
    ...questions.map((q) => q.label)
  ];
  const rows = [header];

  for (const r of state.responses) {
    rows.push([
      r.received_at || "",
      r.source || "",
      r.session_id ?? "",
      r.device_id ?? "",
      r.submission_id ?? "",
      ...questions.map((q) => formatAnswer(q, r.answers?.[q.id]))
    ]);
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `small-group-session-${state.settings.sessionId}-responses.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  addLog("CSV exported with active question columns.");
  saveAndRender();
}

async function importCsvFromFile() {
  const input = document.querySelector("#csvFile");
  const file = input?.files?.[0];

  if (!file) {
    state.meta.importNote = "Choose a CSV file first.";
    saveAndRender();
    return;
  }

  try {
    const text = await file.text();
    const parsed = parseCsv(text);
    const headers = (parsed[0] || []).map((h) => h.trim());
    const rows = parsed.slice(1);

    const questionColumns = headers
      .map((header, index) => ({ header, index }))
      .filter((column) => column.header && !isGoogleFormsMetadataHeader(column.header));

    if (!questionColumns.length) {
      throw new Error("No CSV headers found.");
    }

    state.settings.coreQuestions = questionColumns.map((column, questionIndex) => {
      const values = rows.map((row) => row[column.index]).filter((value) => value !== undefined && value !== "");
      return inferQuestionFromCsvHeader(column.header, values, questionIndex);
    });

    const skippedCount = headers.filter((header) => header && isGoogleFormsMetadataHeader(header)).length;
    const noResponses = rows.length === 0;
    state.meta.importNote = [
      `Imported ${questionColumns.length} question headers from ${file.name}.`,
      skippedCount ? `Skipped ${skippedCount} Google Forms metadata column${skippedCount === 1 ? "" : "s"}.` : "",
      noResponses ? "No response rows were present, so types were estimated from the headers and question order." : "Types were inferred from response values where possible.",
      "Review each question before sending."
    ].filter(Boolean).join(" ");
    reindexCoreQuestions();
    saveAndRender();
  } catch (error) {
    state.meta.importNote = `CSV import failed: ${error.message || error}`;
    saveAndRender();
  }
}

async function importGoogleFormFromApi() {
  const linkInput = document.querySelector("#googleFormUrl");
  const clientIdInput = document.querySelector("#googleClientId");
  const formLink = linkInput?.value.trim() || "";
  const clientId = clientIdInput?.value.trim() || localStorage.getItem(GOOGLE_FORMS_CLIENT_ID_STORAGE_KEY) || "";

  state.meta.googleFormUrl = formLink;
  localStorage.setItem(GOOGLE_FORMS_CLIENT_ID_STORAGE_KEY, clientId);

  try {
    const formId = extractGoogleFormId(formLink);
    if (!formId) throw new Error("Paste a Google Form editor link or API form ID. Published /forms/d/e response links do not expose the API form ID.");
    if (!clientId) throw new Error("Add a Google OAuth client ID first.");

    state.meta.importNote = "Waiting for Google authentication...";
    saveState(state);

    const accessToken = await requestGoogleFormsAccessToken(clientId);
    const form = await fetchGoogleForm(formId, accessToken);
    const converted = convertGoogleFormToCoreQuestions(form);

    if (!converted.questions.length) {
      throw new Error("The form does not contain supported question items.");
    }

    state.settings.coreQuestions = converted.questions;
    state.meta.importNote = [
      `Imported ${converted.questions.length} question${converted.questions.length === 1 ? "" : "s"} from "${form.info?.title || "Google Form"}".`,
      converted.skipped ? `Skipped ${converted.skipped} unsupported item${converted.skipped === 1 ? "" : "s"}.` : "",
      converted.adapted ? `${converted.adapted} question${converted.adapted === 1 ? "" : "s"} were adapted to device-supported types.` : "",
      "Review each question before sending."
    ].filter(Boolean).join(" ");
    reindexCoreQuestions();
    addLog(`Google Forms import completed for form ${formId}.`);
    saveAndRender();
  } catch (error) {
    state.meta.importNote = `Google Forms import failed: ${error.message || error}`;
    addLog(state.meta.importNote);
    saveAndRender();
  }
}

function extractGoogleFormId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/\/forms\/d\/e\//i.test(raw)) return "";

  const pathMatch = raw.match(/\/forms\/d\/([^/?#]+)/i);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  const idParam = raw.match(/[?&]formId=([^&#]+)/i);
  if (idParam) return decodeURIComponent(idParam[1]);

  return /^[\w-]{20,}$/.test(raw) ? raw : "";
}

async function requestGoogleFormsAccessToken(clientId) {
  await loadGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_FORMS_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: (error) => reject(new Error(error?.message || error?.type || "Google authentication was cancelled."))
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Google Identity Services.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Identity Services."));
    document.head.appendChild(script);
  });
}

async function fetchGoogleForm(formId, accessToken) {
  const response = await fetch(`${GOOGLE_FORMS_API_BASE}/${encodeURIComponent(formId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`forms.get failed: ${message}`);
  }

  return response.json();
}

function convertGoogleFormToCoreQuestions(form) {
  const output = [];
  let skipped = 0;
  let adapted = 0;

  for (const item of form.items || []) {
    if (item.questionItem?.question) {
      const converted = convertGoogleQuestion(item.questionItem.question, item.title, output.length);
      if (converted) {
        output.push(converted.question);
        adapted += converted.adapted ? 1 : 0;
      } else {
        skipped += 1;
      }
      continue;
    }

    if (item.questionGroupItem?.questions?.length) {
      const columns = getChoiceValues(item.questionGroupItem.grid?.columns);
      for (const row of item.questionGroupItem.questions) {
        const label = [item.title, row.rowQuestion?.title].filter(Boolean).join(" - ");
        const converted = convertGoogleQuestion(row, label, output.length, columns);
        if (converted) {
          output.push(converted.question);
          adapted += converted.adapted ? 1 : 0;
        } else {
          skipped += 1;
        }
      }
      continue;
    }

    skipped += 1;
  }

  return { questions: output, skipped, adapted };
}

function convertGoogleQuestion(question, title, index, sharedOptions = []) {
  const label = title || `Question ${index + 1}`;
  const base = {
    id: `q${index + 1}`,
    label,
    required: question.required !== false,
    imported: true,
    googleQuestionId: question.questionId
  };

  if (question.choiceQuestion) {
    const options = getChoiceValues(question.choiceQuestion);
    const type = question.choiceQuestion.type || "CHOICE";
    const isLikert = looksLikeLikert(options);

    return {
      question: {
        ...base,
        template: isLikert ? "likert" : "choice",
        options,
        googleQuestionType: type
      },
      adapted: type === "CHECKBOX" || isLikert
    };
  }

  if (question.scaleQuestion) {
    const low = Number(question.scaleQuestion.low ?? 1);
    const high = Number(question.scaleQuestion.high ?? 5);
    const isNps = low === 0 && high === 10;

    return {
      question: {
        ...base,
        template: isNps ? "nps" : "scale5",
        min: isNps ? 0 : low,
        max: isNps ? 10 : high,
        googleQuestionType: "SCALE"
      },
      adapted: !isNps && (low !== 1 || high !== 5)
    };
  }

  if (question.textQuestion) {
    return {
      question: {
        ...base,
        template: "short_text",
        maxLength: question.textQuestion.paragraph ? 240 : 120,
        googleQuestionType: question.textQuestion.paragraph ? "PARAGRAPH_TEXT" : "SHORT_TEXT"
      },
      adapted: Boolean(question.textQuestion.paragraph)
    };
  }

  if (question.rowQuestion && sharedOptions.length) {
    const isLikert = looksLikeLikert(sharedOptions);

    return {
      question: {
        ...base,
        template: isLikert ? "likert" : "choice",
        options: sharedOptions,
        googleQuestionType: "GRID_ROW"
      },
      adapted: true
    };
  }

  return null;
}

function getChoiceValues(choiceQuestion) {
  return (choiceQuestion?.options || [])
    .map((option) => option.isOther ? "Other" : option.value)
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function inferQuestionFromCsvHeader(header, values, index) {
  const cleanValues = values.map((value) => String(value).trim()).filter(Boolean);
  const lower = header.toLowerCase();
  const numeric = cleanValues.map(Number).filter(Number.isFinite);
  let template = "scale5";

  if (looksLikeNpsHeader(lower)) {
    template = "nps";
  } else if (looksLikeLikertHeader(lower)) {
    template = "likert";
  } else if (looksLikeScaleHeader(lower)) {
    template = "scale5";
  } else if (numeric.length && numeric.length === cleanValues.length) {
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    template = min >= 0 && max <= 10 && (min === 0 || max > 5) ? "nps" : "scale5";
  } else if (looksLikeLikert(cleanValues)) {
    template = "likert";
  } else {
    template = defaultTemplateForImportedQuestion(index);
  }

  return {
    id: `q${index + 1}`,
    label: header,
    template,
    required: true,
    imported: true
  };
}

function readSurveyEditorIntoState() {
  const editors = [...document.querySelectorAll(".question-editor")];
  if (!editors.length) return;

  state.settings.coreQuestions = editors.map((editor, index) => {
    const label = editor.querySelector('[data-field="label"]')?.value.trim() || `Question ${index + 1}`;
    const template = normaliseOperatorTemplate(editor.querySelector('[data-field="template"]')?.value || "scale5");
    const required = editor.querySelector('[data-field="required"]')?.checked !== false;
    const options = parseOptionsInput(editor.querySelector('[data-field="options"]')?.value || "");
    const existing = state.settings.coreQuestions[index] || {};

    return {
      ...existing,
      id: `q${index + 1}`,
      label,
      template,
      required,
      options: template === "choice" || template === "likert" ? options : undefined,
      optionsInferred: false
    };
  });
}

function renderQuestionPreviewTable(questions) {
  if (!questions.length) return `<p>No questions configured.</p>`;

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Type</th>
            <th>Details</th>
            <th>Public screen</th>
          </tr>
        </thead>
        <tbody>
          ${questions.map((q) => `
            <tr>
              <td>${escapeHtml(q.label)}</td>
              <td>${escapeHtml(q.kind)}</td>
              <td>${escapeHtml(questionDetails(q))}</td>
              <td>${q.private ? "Hidden" : "Shown"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderResponseTable() {
  if (!state.responses.length) return `<p>No completed submissions yet.</p>`;

  const questions = buildQuestions(state.settings);
  const headerCells = [
    "Received",
    "Source",
    "Participant",
    ...questions.map((q) => q.label)
  ];

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headerCells.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${state.responses.slice().reverse().map((r) => `
            <tr>
              <td>${escapeHtml(r.received_at || "")}</td>
              <td>${escapeHtml(r.source || "")}</td>
              <td>${escapeHtml(displayParticipantName(r))}</td>
              ${questions.map((q) => `<td>${escapeHtml(formatAnswer(q, r.answers?.[q.id]))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDistribution(distribution, options = {}) {
  const entries = Object.entries(distribution);
  if (!entries.length) return `<p>No data yet.</p>`;

  const max = Math.max(...entries.map(([, count]) => Number(count) || 0), 1);
  const total = Number(options.total) || entries.reduce((sum, [, count]) => sum + Number(count || 0), 0);

  return `
    <div class="bar-list">
      ${entries.map(([label, count]) => `
        <div class="bar-row">
          <span>${escapeHtml(formatAnalyticsLabel(label))}</span>
          <div><i style="width:${Math.max(4, (Number(count) / max) * 100)}%"></i></div>
          <strong>${escapeHtml(formatCountWithPercent(count, total))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCounts(counts, options = {}) {
  const entries = Object.entries(counts);
  if (!entries.length) return `<p>No data yet.</p>`;

  return renderDistribution(counts, options);
}

function renderStatusCard(label, value, status, detail) {
  return `
    <div class="system-status-card ${escapeHtml(status)}">
      <span><i></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function getLastResponse(responses) {
  return (responses || [])
    .slice()
    .sort((a, b) => responseTimeMs(b) - responseTimeMs(a))[0] || null;
}

function responseTimeMs(response) {
  const received = Date.parse(response?.received_at || "");
  if (Number.isFinite(received)) return received;
  const timestamp = Number(response?.timestamp_ms);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatRelativeTime(response) {
  const time = responseTimeMs(response);
  if (!time) return "recently";

  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function getFacilitatorCue(responseCount, lastResponse) {
  if (!responseCount) return "Waiting for responses. Keep the public screen open and confirm input devices are ready.";
  return `Session running. ${lastResponse ? `Last response ${formatRelativeTime(lastResponse)}.` : ""}`.trim();
}

function analyticsTitle(question) {
  if (question.id === "fishVariant") return "Selected Aquarium Creature";
  if (question.id === "fishStyle") return "Selected ASCII Creature";
  if (question.id === "fishColour" || question.id === "artColour") return "Selected Colour";
  if (question.id === "fishSize") return "Selected Size";
  if (question.id === "treePart") return "Selected Tree Addition";
  if (question.id === "name") return "Participant Names";

  const lower = String(question.label || "").toLowerCase();
  if (lower.includes("confidence") || lower.includes("confident")) return "Confidence Level";
  if (lower.includes("recommend")) return "Recommendation Score";
  if (lower.includes("innovation") || lower.includes("discussion")) return "Innovation Rating";

  return question.label || "Question Summary";
}

function analyticsTypeLabel(question) {
  if (question.id === "name") return "Private text";
  if (question.kind === "scale") return "Rating";
  if (question.kind === "nps") return "Recommendation";
  if (question.kind === "likert") return "Sentiment";
  if (question.kind === "choice") return "Selection";
  if (question.kind === "short_text") return "Private text";
  return "Question";
}

function normaliseChoiceCounts(counts, question) {
  const output = {};

  Object.entries(counts || {}).forEach(([raw, count]) => {
    const label = normaliseChoiceAnalyticsLabel(raw, question);
    output[label] = (output[label] || 0) + Number(count || 0);
  });

  return output;
}

function normaliseChoiceAnalyticsLabel(value, question) {
  const raw = String(value || "").trim();

  if (question.id === "fishVariant" || /^(betta|tetra|gourami|shark|crab)\d+$/i.test(raw)) {
    return raw.replace(/\d+$/g, "").toLowerCase();
  }

  return raw;
}

function formatAnalyticsLabel(label) {
  const clean = String(label || "").trim();
  if (!clean) return "Unknown";
  if (/^\d+\s+-\s+/.test(clean)) return clean.replace(/^\d+\s+-\s+/, "");
  return clean
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCountWithPercent(count, total) {
  const numericCount = Number(count) || 0;
  const numericTotal = Number(total) || 0;

  if (!numericTotal) return String(numericCount);

  const percent = Math.round((numericCount / numericTotal) * 100);
  return `${numericCount} (${percent}%)`;
}

function renderSerialTroubleshooting() {
  const unsupported = !isSerialSupported();
  const hasError = Boolean(state.meta.serialError);

  if (!unsupported && !hasError) {
    return `<p class="field-help">If the hardware does not respond, open Advanced for the serial log.</p>`;
  }

  return `
    <div class="troubleshooting">
      <strong>${unsupported ? "Web Serial is not available in this browser." : `Connection issue: ${escapeHtml(state.meta.serialError)}`}</strong>
      <ul>
        <li>Use Chrome or Edge.</li>
        <li>Check the meeting hardware is plugged in.</li>
        <li>Check the correct serial port is selected.</li>
        <li>Reset the hardware and try again.</li>
        <li>Disconnect/reconnect USB if needed.</li>
      </ul>
    </div>
  `;
}

function validateQuestionSetForSend(questions) {
  const errors = [];

  if (!questions.length) errors.push("No questions are configured.");

  questions.forEach((question, index) => {
    const label = question.label || `Question ${index + 1}`;

    if (!question.label?.trim()) errors.push(`${label}: missing question text.`);

    if ((question.kind === "choice" || question.kind === "likert") && (!Array.isArray(question.options) || question.options.length < 2)) {
      errors.push(`${label}: add at least two answer options.`);
    }

    if ((question.kind === "scale" || question.kind === "nps") && Number(question.min) >= Number(question.max)) {
      errors.push(`${label}: scale minimum must be lower than maximum.`);
    }
  });

  return errors;
}

function buildSendConfirmationMessage(questions) {
  const privateCount = questions.filter((q) => q.private).length;
  const publicCount = questions.length - privateCount;
  const requiredCount = questions.filter((q) => q.required).length;
  const importedCount = questions.filter((q) => q.imported).length;
  const connectedLine = state.meta.serialConnected
    ? "Hardware status: connected"
    : "Hardware status: not marked connected";

  return [
    "Send this question set to the ESP32 input devices?",
    "",
    `Session: ${state.settings.sessionName} (${state.settings.sessionId})`,
    connectedLine,
    `Questions: ${questions.length} total (${privateCount} private, ${publicCount} public)`,
    `Required questions: ${requiredCount}`,
    importedCount ? `Imported questions: ${importedCount}` : null,
    "",
    "Participants may start answering this version after it is sent."
  ].filter((line) => line !== null).join("\n");
}

function metric(label, value) {
  return `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function addLog(message) {
  const stamp = new Date().toLocaleTimeString();
  state.logs.push(`[${stamp}] ${message}`);
  if (state.logs.length > 300) state.logs = state.logs.slice(-300);
}

function saveAndRender() {
  state = normaliseState(state);
  saveState(state);

  const route = getRoute();
  if (route === "group" || visualisationRoutes.includes(route)) return;

  render();
}

function getRoute() {
  return location.hash.replace("#/", "") || "setup";
}

function setActiveNav() {
  const route = getRoute();
  const mappedRoute = route === "monitor" ? "results" : visualisationRoutes.includes(route) ? "group" : route;
  document.querySelectorAll(".nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === mappedRoute);
  });
}

function renderReadinessIndicators() {
  const bar = document.querySelector(".readiness-bar");
  if (!bar) return;

  const pairedDevices = getPairedDeviceCount();
  const connected = Boolean(state.meta.serialConnected);
  const publicOnline = Boolean(state.meta.publicScreenOnline);

  bar.innerHTML = `
    <span class="ready-pill ${connected ? "ok" : "warn"}"><i></i>${connected ? "Hardware connected" : "Hardware disconnected"}</span>
    <span class="ready-pill"><i></i>${pairedDevices} paired device${pairedDevices === 1 ? "" : "s"}</span>
    <span class="ready-pill ${publicOnline ? "ok" : "warn"}"><i></i>Public screen ${publicOnline ? "online" : "offline"}</span>
  `;
}

function getPairedDeviceCount() {
  return new Set((state.responses || [])
    .map((response) => response.device_id)
    .filter((id) => id !== undefined && id !== null && id !== "")).size;
}

function ensureSetupDefaults() {
  if (!state.meta.sessionIdGenerated) {
    state.settings.sessionId = Math.floor(100000 + Math.random() * 900000);
    state.meta.sessionIdGenerated = true;
  }

  if (!state.settings.sessionName) {
    state.settings.sessionName = `Meeting session ${new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    })}`;
  }

  if (!Array.isArray(state.settings.coreQuestions) || state.settings.coreQuestions.length === 0) {
    state.settings.coreQuestions = [
      {
        id: "q1",
        label: "Rate J&J on innovation",
        template: "scale5",
        required: true
      },
      {
        id: "q2",
        label: "Satisfaction with J&J interactions",
        template: "choice",
        options: ["Yes", "No"],
        required: true
      },
      {
        id: "q3",
        label: "Recommend J&J to a colleague?",
        template: "nps",
        required: true
      }
    ];
  }

  sanitiseOperatorQuestions();

  if (state.meta.setupStep === undefined) state.meta.setupStep = 0;
}

function reindexCoreQuestions() {
  state.settings.coreQuestions = state.settings.coreQuestions.map((q, index) => ({
    ...q,
    id: `q${index + 1}`
  }));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function looksLikeLikert(values) {
  if (!values.length) return false;
  const joined = values.join(" ").toLowerCase();
  return ["strongly agree", "agree", "neutral", "disagree", "satisfied", "dissatisfied"].some((token) => joined.includes(token));
}

function isGoogleFormsMetadataHeader(header) {
  const normalised = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return [
    "timestamp",
    "email address",
    "score",
    "username",
    "last modified time"
  ].includes(normalised);
}

function looksLikeNpsHeader(header) {
  return /\bnps\b/.test(header) ||
    header.includes("recommend") ||
    header.includes("0-10") ||
    header.includes("0 to 10") ||
    header.includes("zero to ten");
}

function looksLikeLikertHeader(header) {
  return header.includes("agree") ||
    header.includes("satisfied") ||
    header.includes("satisfaction") ||
    header.includes("confidence") ||
    header.includes("confident") ||
    header.includes("comfort") ||
    header.includes("extent");
}

function looksLikeScaleHeader(header) {
  return header.includes("rate") ||
    header.includes("rating") ||
    header.includes("1-5") ||
    header.includes("1 to 5") ||
    header.includes("one to five");
}

function defaultTemplateForImportedQuestion(index) {
  const defaults = ["scale5", "likert", "nps"];
  return defaults[index] || "scale5";
}

function normaliseOperatorTemplate(template) {
  return operatorTemplateIds.includes(template) ? template : "scale5";
}

function parseOptionsInput(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function getEditableOptions(question, template) {
  if (Array.isArray(question.options) && question.options.length) return question.options;
  if (Array.isArray(questionTemplates[template]?.options)) return questionTemplates[template].options;
  return [];
}

function sanitiseOperatorQuestions() {
  const before = JSON.stringify(state.settings.coreQuestions || []);

  state.settings.coreQuestions = (state.settings.coreQuestions || [])
    .filter((question) => !isGoogleFormsMetadataHeader(question.label))
    .map((question, index) => ({
      ...question,
      id: `q${index + 1}`,
      label: genericQuestionLabel(question.label),
      template: normaliseOperatorTemplate(question.template),
      options: Array.isArray(question.options) ? question.options : undefined,
      optionsInferred: false
    }));

  return before !== JSON.stringify(state.settings.coreQuestions);
}

function genericQuestionLabel(label) {
  const lower = String(label || "").toLowerCase();

  if (lower.includes("innovation")) return "How would you rate today's discussion?";
  if (lower.includes("last 6 months")) return "How confident do you feel about the topic after the discussion?";
  if (lower.includes("recommend") && lower.includes("colleague")) return "How likely are you to recommend a similar session to a colleague?";

  return label;
}

function engagementTitle(title) {
  if (title === "Aquarium") return "Aquarium";
  if (title === "Sand Abstract Art") return "Sand";
  return title;
}

function findDuplicateSubmissionIds() {
  const seen = new Set();
  const duplicates = new Set();

  for (const response of state.responses) {
    const id = String(response.submission_id || "");
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }

  return [...duplicates];
}

function displayParticipantName(response) {
  const name = response?.answers?.name;
  if (state.settings.showNames && name) return name;

  const index = state.responses.findIndex((item) => item.submission_id === response.submission_id);
  return `Participant ${index + 1 || ""}`.trim();
}

function questionDetails(q) {
  if (q.kind === "scale" || q.kind === "nps") return `${q.min} to ${q.max}`;
  if (q.kind === "likert" || q.kind === "choice") return Array.isArray(q.options) && q.options.length ? q.options.join(", ") : "Options required";
  if (q.kind === "short_text") return `max ${q.maxLength || 120} chars`;
  return "-";
}

function csvCell(value) {
  const str = String(value ?? "");
  return `"${str.replaceAll('"', '""')}"`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
