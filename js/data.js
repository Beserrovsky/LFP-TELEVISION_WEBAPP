export const colourMap = {
  cyan: "#6df7ff",
  pink: "#ff79d1",
  yellow: "#ffe66d",
  orange: "#ffb057",
  lime: "#8cff7a",
  green: "#8cff7a",
  purple: "#c58cff",
  blue: "#74a8ff",
  white: "#f2fff8"
};

function art(lines) {
  return lines.join("\n");
}

export const fishStyles = {
  tiny: {
    right: ["><>", "><>", "><>", "><>"],
    left: ["<><", "<><", "<><", "<><"]
  },

  medium: {
    right: ["><((°>", "><((º>", "><((o>", "><((°>"],
    left: ["<°))><", "<º))><", "<o))><", "<°))><"]
  },

  round: {
    right: ["><(o>", "><(O>", "><(°>", "><(º>"],
    left: ["<o)><", "<O)><", "<°)><", "<º)><"]
  },

  classic: {
    right: ["><(((º>", "><(((°>", "><((((o>", "><(((º>"],
    left: ["<º)))><", "<°)))><", "<o))))><", "<º)))><"]
  },

  crab: {
    right: [
      art([
        "-/\\",
        "( /   @ @    ()",
        " \\\\ __| |__  /",
        "  \\/   \"   \\/",
        " /-|       |-\\",
        "/ /-\\     /-\\ \\",
        " / /-`---'-\\ \\",
        "  /         \\"
      ])
    ],
    left: [
      art([
        "-/\\",
        "( /   @ @    ()",
        " \\\\ __| |__  /",
        "  \\/   \"   \\/",
        " /-|       |-\\",
        "/ /-\\     /-\\ \\",
        " / /-`---'-\\ \\",
        "  /         \\"
      ])
    ]
  },

  shark: {
    right: [
      art([
        "      .",
        "\\_____)\\_____",
        "/--v____ __`<",
        "        )/",
        "        '`"
      ])
    ],
    left: [
      art([
        "       .",
        "  _____/(___/",
        ">`__ ____v--\\",
        "       \\(",
        "        `"
      ])
    ]
  }
};

export const fishSizeOptions = ["small", "medium", "large"];

export const fishSpriteOptions = [
  "betta1",
  "betta2",
  "betta3",
  "betta4",
  "betta5",
  "tetra1",
  "tetra2",
  "tetra3",
  "tetra4",
  "tetra5",
  "tetra6",
  "gourami1",
  "gourami2",
  "gourami3",
  "gourami4",
  "gourami5",
  "gourami6",
  "shark1",
  "crab1",
  "crab2",
  "crab3",
  "crab4"
];

export const employeeSpeciesMap = {
  junior:  { family: "betta",   count: 5 },
  vitoria: { family: "gourami", count: 6 },
  sergio:  { family: "tetra",   count: 5 }
};

export const satisfactionMap = {
  "Very low": 1,
  Low: 2,
  Neutral: 3,
  High: 4,
  "Very high": 5
};

export const questionTemplates = {
  scale5: {
    label: "Rate 1-5",
    kind: "scale",
    min: 1,
    max: 5,
    options: ["1", "2", "3", "4", "5"]
  },

  likert: {
    label: "Likert",
    kind: "likert",
    options: [
      "Very low",
      "Low",
      "Neutral",
      "High",
      "Very high"
    ]
  },

  nps: {
    label: "NPS 0-10",
    kind: "nps",
    min: 0,
    max: 10,
    options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
  },

  short_text: {
    label: "Short text",
    kind: "short_text",
    maxLength: 120
  },

  choice: {
    label: "Choice",
    kind: "choice",
    options: []
  }
};

export const visualisationDefinitions = {
  vis1: {
    title: "Aquarium",
    description: "Clean aquarium group screen. Public choices create one fish per completed submission.",
    getQuestions(optionalName = true) {
      const qs = [
        {
          id: "fishVariant",
          label: "Which aquarium creature would you like?",
          kind: "choice",
          options: fishSpriteOptions,
          required: true,
          private: false
        }
      ];

      if (optionalName) {
        qs.push({
          id: "name",
          label: "First name",
          kind: "short_text",
          maxLength: 10,
          required: false,
          private: false
        });
      }

      return qs;
    }
  },

  vis2: {
    title: "Sand Abstract Art",
    description: "Abstract sand canvas. Participants choose colour and position.",
    getQuestions() {
      return [
        {
          id: "artColour",
          label: "Choose a sand colour",
          kind: "choice",
          options: Object.keys(colourMap),
          required: true,
          private: false
        },
        {
          id: "artXPosition",
          label: "Choose where your sand should fall",
          kind: "choice",
          options: ["left", "centre-left", "centre", "centre-right", "right"],
          required: true,
          private: false
        }
      ];
    }
  },

  vis3: {
    title: "Tree",
    description: "Growing illustrated tree. Each completed submission adds one leaf or flower.",
    getQuestions(optionalName = true) {
      const qs = [
        {
          id: "treePart",
          label: "Would you like to add a leaf or a flower?",
          kind: "choice",
          options: ["leaf", "flower"],
          required: true,
          private: false
        }
      ];

      if (optionalName) {
        qs.push({
          id: "name",
          label: "First name",
          kind: "short_text",
          maxLength: 10,
          required: false,
          private: false
        });
      }

      return qs;
    }
  },

  vis4: {
    title: "Collaborator 1",
    description: "Blank collaborator canvas. Edit js/visualisation-1.js to build this visualisation.",
    getQuestions() {
      return [];
    }
  },

  vis5: {
    title: "Collaborator 2",
    description: "Blank collaborator canvas. Edit js/visualisation-2.js to build this visualisation.",
    getQuestions() {
      return [];
    }
  },

  vis6: {
    title: "Collaborator 3",
    description: "Blank collaborator canvas. Edit js/visualisation-3.js to build this visualisation.",
    getQuestions() {
      return [];
    }
  },

  vis7: {
    title: "Collaborator 4",
    description: "Blank collaborator canvas. Edit js/visualisation-4.js to build this visualisation.",
    getQuestions() {
      return [];
    }
  },

  vis8: {
    title: "ASCII Aquarium",
    description: "Original retro ASCII aquarium. Participants choose creature type, colour, and size.",
    getQuestions(optionalName = true) {
      const qs = [
        {
          id: "fishStyle",
          label: "What type of fish would you like?",
          kind: "choice",
          options: Object.keys(fishStyles),
          required: true,
          private: false
        },
        {
          id: "fishColour",
          label: "What colour fish would you like?",
          kind: "choice",
          options: Object.keys(colourMap),
          required: true,
          private: false
        },
        {
          id: "fishSize",
          label: "What size fish would you like?",
          kind: "choice",
          options: fishSizeOptions,
          required: true,
          private: false
        }
      ];

      if (optionalName) {
        qs.push({
          id: "name",
          label: "First name",
          kind: "short_text",
          maxLength: 10,
          required: false,
          private: false
        });
      }

      return qs;
    }
  }
};

export const defaultState = {
  settings: {
    sessionId: 1,
    sessionName: "",
    activeVis: "vis1",
    optionalName: true,
    showNames: false,
    coreQuestions: [
      {
        id: "q1",
        label: "Rate J&J on innovation",
        template: "scale5"
      },
      {
        id: "q2",
        label: "Satisfaction with J&J interactions",
        template: "choice",
        options: ["Yes", "No"]
      },
      {
        id: "q3",
        label: "Recommend J&J to a colleague?",
        template: "nps"
      }
    ]
  },

  responses: [],
  logs: [],

  meta: {
    fakeCounter: 0,
    serialConnected: false
  }
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultState() {
  return clone(defaultState);
}

export function normaliseState(state) {
  const fallback = createDefaultState();
  const output = {
    ...fallback,
    ...state,
    settings: {
      ...fallback.settings,
      ...(state?.settings || {})
    },
    meta: {
      ...fallback.meta,
      ...(state?.meta || {})
    },
    responses: Array.isArray(state?.responses) ? state.responses : [],
    logs: Array.isArray(state?.logs) ? state.logs : []
  };

  if (!Array.isArray(output.settings.coreQuestions)) {
    output.settings.coreQuestions = clone(fallback.settings.coreQuestions);
  }

  if (!Number.isFinite(Number(output.settings.sessionId)) || Number(output.settings.sessionId) < 1) {
    output.settings.sessionId = Math.floor(100000 + Math.random() * 900000);
  }

  if (!output.settings.sessionName) {
    output.settings.sessionName = `Meeting session ${new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    })}`;
  }

  output.settings.coreQuestions = output.settings.coreQuestions.map((q, index) => ({
    id: q.id || `q${index + 1}`,
    label: q.label || `Question ${index + 1}`,
    template: q.template || "scale5",
    options: Array.isArray(q.options) ? q.options : undefined,
    min: Number.isFinite(Number(q.min)) ? Number(q.min) : undefined,
    max: Number.isFinite(Number(q.max)) ? Number(q.max) : undefined,
    maxLength: Number.isFinite(Number(q.maxLength)) ? Number(q.maxLength) : undefined,
    required: q.required !== false,
    imported: Boolean(q.imported),
    optionsInferred: Boolean(q.optionsInferred),
    googleQuestionId: q.googleQuestionId || undefined,
    googleQuestionType: q.googleQuestionType || undefined
  }));

  // Migrate: satisfaction question changed from 5-point likert to binary Yes/No choice
  output.settings.coreQuestions = output.settings.coreQuestions.map((q) => {
    if (q.template === "likert" && !Array.isArray(q.options) &&
        /satisfaction|happy/i.test(q.label || "")) {
      return { ...q, template: "choice", options: ["Yes", "No"] };
    }
    return q;
  });

  if (!visualisationDefinitions[output.settings.activeVis]) {
    output.settings.activeVis = "vis1";
  }

  return output;
}

export function getVisualisationQuestions(activeVis, optionalName = true) {
  const def = visualisationDefinitions[activeVis] || visualisationDefinitions.vis1;
  return def.getQuestions(optionalName);
}

export function buildQuestions(settings) {
  const safeSettings = {
    ...defaultState.settings,
    ...(settings || {})
  };

  const coreQuestions = (safeSettings.coreQuestions || []).map((q, index) => {
    const fallbackId = `q${index + 1}`;
    const template = questionTemplates[q.template] || questionTemplates.scale5;
    const options = Array.isArray(q.options) && q.options.length
      ? q.options
      : Array.isArray(template.options)
        ? template.options
        : undefined;

    return {
      id: q.id || fallbackId,
      ...template,
      label: q.label || `Question ${index + 1}`,
      private: true,
      template: q.template || "scale5",
      options,
      min: Number.isFinite(Number(q.min)) ? Number(q.min) : template.min,
      max: Number.isFinite(Number(q.max)) ? Number(q.max) : template.max,
      maxLength: Number.isFinite(Number(q.maxLength)) ? Number(q.maxLength) : template.maxLength,
      required: q.required !== false,
      imported: Boolean(q.imported),
      optionsInferred: Boolean(q.optionsInferred),
      googleQuestionId: q.googleQuestionId || undefined,
      googleQuestionType: q.googleQuestionType || undefined
    };
  });

  const visualQuestions = getVisualisationQuestions(
    safeSettings.activeVis,
    safeSettings.optionalName
  );

  return [...coreQuestions, ...visualQuestions];
}

export function createFakeSubmission(state, counter) {
  const sessionId = Number(state.settings.sessionId || 1);
  const deviceId = 1 + (counter % 3);
  const submissionId = `${sessionId}-${deviceId}-${counter}`;
  const questions = buildQuestions(state.settings);

  const names = [
    "Ana",
    "Livia",
    "Felipe",
    "Joao",
    "Maya",
    "Rafa",
    "Theo",
    "Nina",
    "Alex",
    "Beatriz",
    "Bruno",
    "Camila",
    "Caio",
    "Clara",
    "Davi",
    "Eduarda",
    "Enzo",
    "Fernanda",
    "Gabriel",
    "Helena",
    "Isabela",
    "Laura",
    "Lucas",
    "Luiza",
    "Manuela",
    "Marina",
    "Mateus",
    "Miguel",
    "Pedro",
    "Sofia",
    "Valentina",
    "Yasmin"
  ];
  const answers = {};

  for (const q of questions) {
    if (q.kind === "scale" || q.kind === "nps") {
      answers[q.id] = randomInt(q.min, q.max);
    } else if (q.kind === "likert") {
      answers[q.id] = q.options[randomInt(0, q.options.length - 1)];
    } else if (q.kind === "choice") {
      answers[q.id] = q.options.length ? q.options[randomInt(0, q.options.length - 1)] : "Option 1";
    } else if (q.kind === "short_text") {
      answers[q.id] = names[randomInt(0, names.length - 1)];
    }
  }

  return {
    type: "SUBMISSION",
    session_id: sessionId,
    device_id: deviceId,
    submission_id: submissionId,
    timestamp_ms: Date.now(),
    answers
  };
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normaliseFishVariant(fishType, fishColour) {
  const rawType = String(fishType ?? "").trim();
  if (!rawType) return rawType;

  const lowerType = rawType.toLowerCase();
  if (fishSpriteOptions.includes(lowerType)) return lowerType;

  const family = lowerType.replace(/[^a-z]/g, "");
  const variant = String(fishColour ?? "").match(/\d+/)?.[0] || "1";
  const candidate = `${family}${variant}`;

  if (fishSpriteOptions.includes(candidate)) return candidate;

  return fishSpriteOptions.find((option) => option.startsWith(family)) || rawType;
}

function normaliseSatisfaction(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const lower = String(value).trim().toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  const num = Number(value);
  if (num === 1) return "Yes";
  if (num === 0) return "No";
  return undefined;
}

function pickFishVariantForEmployee(employee, seed) {
  const key = String(employee ?? "").trim().toLowerCase();
  const mapping = employeeSpeciesMap[key];
  const n = Math.abs(Math.round(Number(seed) || 0));
  if (mapping) return `${mapping.family}${(n % mapping.count) + 1}`;
  return fishSpriteOptions[n % fishSpriteOptions.length];
}

export function normaliseSubmissionPacket(packet) {
  if (!packet || typeof packet !== "object") return packet;

  // Support both answers-wrapped and flat (top-level) packets from the ESP32 receiver
  const inner = packet.answers && typeof packet.answers === "object" ? packet.answers : {};
  const mapped = { ...inner };

  // Look up a field in the inner answers object first, then the top-level packet
  const get = (...keys) => firstPresent(...keys.flatMap((k) => [inner[k], packet[k]]));

  // Core survey answers
  mapped.q1 = firstPresent(mapped.q1, get("innovation"));
  mapped.q2 = firstPresent(mapped.q2, normaliseSatisfaction(get("satisfaction")));
  mapped.q3 = firstPresent(mapped.q3, get("nps"));

  // Fish variant — derive from bestEmployee using numeric fields as an entropy seed
  const employee = get("bestEmployee", "best_employee", "fish_type");
  const seed = Number(get("counter") || 0)
    + Number(get("innovation") || 0) * 7
    + Number(get("nps") || 0) * 3;
  mapped.fishVariant = firstPresent(
    mapped.fishVariant,
    pickFishVariantForEmployee(employee, seed),
    normaliseFishVariant(get("fish_type"), get("fish_colour"))
  );
  mapped.bestEmployee = firstPresent(mapped.bestEmployee, employee);
  mapped.fishColour = firstPresent(mapped.fishColour, get("fish_colour"));

  // Respondent identity
  mapped.name = firstPresent(mapped.name, get("name"));
  mapped.identifier = firstPresent(mapped.identifier, get("identifier"));

  // Construct submission_id from transport fields if the receiver omitted it
  let outPacket = { ...packet };
  if (!outPacket.submission_id && outPacket.device_id !== undefined && outPacket.counter !== undefined) {
    outPacket.submission_id = `${outPacket.session_id || "0"}-${outPacket.device_id}-${outPacket.counter}`;
  }

  return {
    ...outPacket,
    type: String(packet.type || "").toLowerCase() === "submission" ? "SUBMISSION" : packet.type,
    answers: mapped
  };
}

export function validateSubmission(packet, settings) {
  packet = normaliseSubmissionPacket(packet);

  const errors = [];
  const expectedQuestions = buildQuestions(settings);
  const packetSessionId = String(packet?.session_id ?? "");
  const expectedSessionId = String(settings.sessionId ?? "");
  const matchingSessionId = packetSessionId === expectedSessionId ||
    packetSessionId === "test001" ||
    Number(packet?.session_id) === Number(settings.sessionId);

  if (!packet || typeof packet !== "object") errors.push("Packet is not an object");
  if (packet?.type !== "SUBMISSION") errors.push("Packet type is not SUBMISSION");
  if (!matchingSessionId) errors.push("Wrong session_id");
  if (packet?.device_id === undefined) errors.push("Missing device_id");
  if (!packet?.submission_id) errors.push("Missing submission_id");
  if (!packet?.answers || typeof packet.answers !== "object") errors.push("Missing answers object");

  const answers = packet?.answers || {};

  for (const q of expectedQuestions) {
    const value = answers[q.id];

    if (q.required && (value === undefined || value === null || value === "")) {
      errors.push(`Missing ${q.id}`);
      continue;
    }

    if (value === undefined || value === null || value === "") continue;

    if (q.kind === "scale" || q.kind === "nps") {
      const num = Number(value);

      if (!Number.isFinite(num) || num < q.min || num > q.max) {
        errors.push(`Invalid ${q.id}`);
      }
    }

    if (q.kind === "likert") {
      const stringValue = String(value);
      const numericString = /^-?\d+(\.\d+)?$/.test(stringValue.trim());
      const num = numericString ? Number(value) : NaN;
      const validNumeric = numericString && Number.isFinite(num) && num >= 1 && num <= q.options.length;
      const validText = q.options.includes(stringValue);

      if (!validNumeric && !validText) {
        errors.push(`Invalid ${q.id}`);
      }
    }

    if (q.kind === "choice") {
      if (!Array.isArray(q.options) || q.options.length === 0) {
        errors.push(`Missing options for ${q.id}`);
      } else if (!q.options.includes(String(value))) {
        errors.push(`Invalid ${q.id}`);
      }
    }

    if (q.kind === "short_text") {
      if (String(value).length > (q.maxLength || 999)) {
        errors.push(`Too long: ${q.id}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function computeStats(responses, settings = defaultState.settings) {
  const questions = buildQuestions(settings);
  const count = responses.length;

  const stats = {
    count,
    questionStats: {},
    choiceCounts: {}
  };

  for (const q of questions) {
    const values = responses
      .map((r) => r.answers?.[q.id])
      .filter((v) => v !== undefined && v !== null && v !== "");

    if (q.kind === "scale" || q.kind === "nps" || q.kind === "likert") {
      const nums = values
        .map((v) => {
          if (q.kind === "likert" && satisfactionMap[String(v)] !== undefined) {
            return satisfactionMap[String(v)];
          }

          return Number(v);
        })
        .filter((n) => Number.isFinite(n));

      stats.questionStats[q.id] = {
        label: q.label,
        kind: q.kind,
        average: nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : "0.00",
        count: nums.length,
        distribution: countValues(values.map((v) => formatAnswer(q, v)))
      };

      if (q.kind === "nps") {
        const promoters = nums.filter((n) => n >= 9).length;
        const detractors = nums.filter((n) => n <= 6).length;
        const nps = nums.length
          ? Math.round(((promoters / nums.length) - (detractors / nums.length)) * 100)
          : 0;

        stats.questionStats[q.id].nps = String(nps);
      }
    }

    if (q.kind === "choice") {
      stats.choiceCounts[q.id] = countValues(values);
    }

    if (q.kind === "short_text") {
      stats.questionStats[q.id] = {
        label: q.label,
        kind: q.kind,
        count: values.length,
        recent: values.slice(-6).reverse().map((v) => String(v))
      };
    }
  }

  return stats;
}

export function formatAnswer(question, value) {
  if (value === undefined || value === null || value === "") return "";

  if (question.kind === "likert") {
    const index = Number(value);

    if (Number.isFinite(index) && index >= 1 && index <= question.options.length) {
      return `${index} - ${question.options[index - 1]}`;
    }
  }

  return String(value);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function countValues(values) {
  const out = {};

  for (const value of values) {
    const key = value || "unknown";
    out[key] = (out[key] || 0) + 1;
  }

  return out;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
