export interface RutPointOfSale {
  name: string;
  address: string;
  city: string;
  department: string;
  phone: string;
}

export interface RutData {
  name: string;
  nit: string;
  department: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  economicActivity: string;
  taxResponsibilities: string;
  legalRep: string;
  legalRepDoc: string;
  pointsOfSale: RutPointOfSale[];
  detected: string[];
}

const DEPARTMENTS = [
  "Bogotá D.C.",
  "Norte de Santander",
  "San Andrés y Providencia",
  "Valle del Cauca",
  "Bogotá",
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "Santander",
  "Sucre",
  "Tolima",
  "Vaupés",
  "Vichada",
].sort((a, b) => b.length - a.length);

const DEPARTMENT_REGEX = new RegExp(
  `(${DEPARTMENTS.map((name) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})`,
  "i",
);

const CIIU: Record<string, string> = {
  "4774":
    "Comercio al por menor de otros productos nuevos en establecimientos especializados",
  "4775": "Comercio al por menor de artículos de joyería y relojería",
  "4662": "Comercio al por mayor de metales y productos metalíferos",
  "4771": "Comercio al por menor de prendas de vestir",
};

const LABEL_PATTERNS = [
  /^n[uú]mero de identificaci[oó]n tributaria/i,
  /^nombre\s*\/\s*raz[oó]n social/i,
  /^raz[oó]n social/i,
  /^nombre comercial/i,
  /^direcci[oó]n seccional/i,
  /^actividad econ[oó]mica/i,
  /^fecha inicio/i,
  /^direcci[oó]n/i,
  /^departamento/i,
  /^ciudad/i,
  /^municipio/i,
  /^tel[eé]fono/i,
  /^correo/i,
  /^responsabilidades/i,
  /^datos del representante/i,
  /^nombres? y apellidos/i,
  /^n[uú]mero de identificaci[oó]n/i,
  /^c[eé]dula/i,
  /^formulario/i,
  /^hoja/i,
  /^firma/i,
  /^c[oó]digo/i,
  /^ocupaci[oó]n/i,
  /^tarjeta/i,
  /^lugar de expedici[oó]n/i,
  /^fecha de expedici[oó]n/i,
];

const clean = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^[:\-.,\s]+/, "")
    .replace(/\s+\d{1,3}\.\s*$/, "")
    .replace(/[\s,;]+$/, "")
    .trim();

const stripLineNumber = (line: string) =>
  line.replace(/^\d{1,3}\.\s*/, "").trim();

const isLabel = (line: string) => {
  const normalized = stripLineNumber(line);
  return LABEL_PATTERNS.some((pattern) => pattern.test(normalized));
};

const readValue = (
  lines: string[],
  pattern: RegExp,
  options: { from?: number; max?: number } = {},
) => {
  const start = options.from ?? 0;
  const max = options.max ?? 1;
  for (let index = start; index < lines.length; index += 1) {
    const normalized = stripLineNumber(lines[index]);
    const match = normalized.match(pattern);
    if (!match) continue;
    const inline = clean(
      normalized.slice((match.index ?? 0) + match[0].length),
    );
    if (inline.length > 1 && !isLabel(inline)) {
      return inline;
    }
    const values: string[] = [];
    for (
      let next = index + 1;
      next < lines.length && values.length < max;
      next += 1
    ) {
      if (isLabel(lines[next])) break;
      values.push(lines[next]);
    }
    if (values.length > 0) return clean(values.join(" "));
  }
  return "";
};

const formatNitDigits = (digits: string) => {
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 1)}.${digits.slice(1, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}-${digits.slice(10)}`;
  }
  return digits;
};

const compressDigits = (value: string) => value.replace(/\D/g, "");

const findDigitRun = (line: string, min = 8) => {
  const match = line.match(new RegExp(`(?:\\d\\s+){${min},}\\d`));
  return match ? compressDigits(match[0]) : "";
};

const parseLocation = (lines: string[]) => {
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(DEPARTMENT_REGEX);
    if (!match) continue;
    const rest = lines[index].slice((match.index ?? 0) + match[0].length);
    let city = rest.replace(/(?:\d\s*)+/g, " ").replace(/\s+/g, " ").trim();
    city = city.replace(/^(COLOMBIA|PAIS|PAÍS)\s*/i, "").trim();
    if (!city) {
      const next = lines[index + 1] ?? "";
      if (/^[A-Za-zÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ .']{2,40}$/.test(next)) {
        city = next.trim();
      }
    }
    if (!city && /Bogot/i.test(match[0])) city = match[0];
    return { department: match[0], city };
  }
  return { department: "", city: "" };
};

const normalizeResponsibility = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^Impto\.\s*renta/i, "Impuesto de renta")
    .replace(/\bcompl\./gi, "complementarios")
    .replace(/ordinar\b/i, "ordinario")
    .replace(/t[ií]tulo de rent\b/i, "título de renta")
    .replace(/exogena/i, "exógena");

const parseResponsibilities = (lines: string[]) => {
  const parts: string[] = [];
  lines.forEach((line) => {
    const match = stripLineNumber(line).match(/^(\d{2})\s*-\s*(.+)$/);
    if (!match) return;
    const description = normalizeResponsibility(
      match[2].split(/\s+\d{2}\s*-\s+/)[0],
    );
    if (description && !/^\d+$/.test(description)) parts.push(description);
  });
  return Array.from(new Set(parts)).join(", ");
};

const parsePointsOfSale = (lines: string[]) => {
  const points: RutPointOfSale[] = [];
  lines.forEach((line, index) => {
    if (!/^162\.\s*nombre del establecimiento/i.test(line)) return;
    const segment = lines.slice(index, index + 12);
    const candidate = segment[1] && !isLabel(segment[1]) ? clean(segment[1]) : "";
    const name =
      /[A-Za-zÁÉÍÓÚÑ]{2,}/.test(candidate) && !/^\d+\.?$/.test(candidate)
        ? candidate
        : "";
    const locationLine = segment.find(
      (item, position) =>
        position > 0 &&
        DEPARTMENT_REGEX.test(item) &&
        /(?:\d\s*){2,}/.test(item),
    );
    const location = locationLine
      ? parseLocation([locationLine])
      : { department: "", city: "" };
    const addressIndex = segment.findIndex((item) =>
      /^165\.\s*direcci[oó]n/i.test(item),
    );
    const phoneIndex = segment.findIndex((item) =>
      /^168\.\s*tel[eé]fono/i.test(item),
    );
    const address =
      addressIndex >= 0 ? clean(segment[addressIndex + 1] ?? "") : "";
    const phone =
      phoneIndex >= 0 ? compressDigits(segment[phoneIndex + 1] ?? "") : "";
    if (name) {
      points.push({
        name,
        address,
        city: location.city,
        department: location.department,
        phone,
      });
    }
  });
  return points;
};

export const parseRutText = (rawText: string): RutData => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);

  const flat = lines.join(" ");

  // Razón social
  let name =
    readValue(lines, /^nombre\s*\/\s*raz[oó]n social/i, { max: 2 }) ||
    readValue(lines, /^raz[oó]n social/i, { max: 2 });
  if (!name) {
    const match = flat.match(
      /persona (?:jur[ií]dica|natural)[^A-Z0-9]{0,12}([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .,&'-]{3,80}?)\s+(?:COLOMBIA|UBICACI[OÓ]N)/i,
    );
    name = match ? clean(match[1]) : "";
  }

  // NIT: puede venir como dígitos separados antes de la dirección seccional
  let nit = "";
  const nitRow = lines.find(
    (line) =>
      /impuestos de|direcci[oó]n seccional/i.test(line) &&
      /(?:\d\s+){7,}\d/.test(line),
  );
  const nitRun = nitRow ? findDigitRun(nitRow, 7) : "";
  if (nitRun.length >= 9) {
    nit = formatNitDigits(nitRun.slice(0, Math.min(nitRun.length, 11)));
  }
  if (!nit) {
    const labelIndex = lines.findIndex((line) =>
      /identificaci[oó]n tributaria/i.test(line),
    );
    const scope =
      labelIndex >= 0 ? lines.slice(labelIndex, labelIndex + 3).join(" ") : flat;
    const match = scope.match(/(\d{1,3}(?:[.\s]?\d{3}){2,3})[-\s]*(\d)\b/);
    nit = match
      ? formatNitDigits(
          `${compressDigits(match[1])}${match[2]}`.slice(0, 11),
        )
      : "";
  }

  // Ubicación
  const location = parseLocation(lines);
  const department =
    location.department ||
    readValue(lines, /^departamento/i, { max: 1 });
  const city =
    location.city ||
    readValue(lines, /^ciudad\s*\/?\s*municipio/i, { max: 1 }) ||
    readValue(lines, /^municipio/i, { max: 1 });

  // Dirección
  let address =
    readValue(lines, /^direcci[oó]n(?:\s+principal)?\s*$/i, { max: 2 }) || "";
  if (!address || address.length < 4) {
    address =
      lines.find((line) =>
        /^(CL|CRA|CR|KR|CALLE|CARRERA|AV|AC|DG|TV|MZ|KM)\s+\d/i.test(line),
      ) ?? "";
  }

  // Teléfono
  let phone =
    readValue(lines, /^tel[eé]fonos?(?:\s*\d+)?\s*[:-]?/i, {
      max: 1,
    }).replace(/[^\d+]/g, "") || "";
  if (phone.length < 7) {
    const phoneRow = lines.find((line) => /tel[eé]fono/i.test(line));
    const match = phoneRow?.match(
      /tel[eé]fono\s*(?:\d\s+)?((?:\d\s*){10})/i,
    );
    phone = match ? compressDigits(match[1]) : "";
  }
  if (phone.length > 10) phone = phone.slice(0, 10);

  const emailMatch = rawText.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  );
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  // Actividad económica
  let economicActivity = "";
  const numericRow = lines.find(
    (line) => /^[\d\s]+$/.test(line) && compressDigits(line).length >= 12,
  );
  if (numericRow) {
    const code = compressDigits(numericRow).slice(0, 4);
    economicActivity = CIIU[code] ? `${code} - ${CIIU[code]}` : code;
  }
  if (!economicActivity) {
    economicActivity = readValue(
      lines,
      /^actividad econ[oó]mica principal/i,
      { max: 2 },
    );
  }

  // Representante legal
  let legalRep =
    readValue(lines, /^nombres? y apellidos/i, { max: 2 }) || "";
  let legalRepDoc = "";
  const repDocRow = lines.find(
    (line) =>
      /c[eé]dula de ciudadan/i.test(line) &&
      /(?:\d\s+){6,}\d/.test(line),
  );
  if (repDocRow) {
    legalRepDoc = findDigitRun(repDocRow, 6);
    if (!legalRep) {
      const index = lines.indexOf(repDocRow);
      legalRep =
        lines
          .slice(index + 1, index + 4)
          .find((line) => /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .']{5,}$/.test(line)) ?? "";
    }
  }
  if (!legalRep && !legalRepDoc) {
    const repIndex = lines.findIndex((line) =>
      /datos del representante legal|representante legal/i.test(line),
    );
    if (repIndex >= 0) {
      legalRep =
        readValue(lines, /^nombres? y apellidos/i, {
          from: repIndex,
          max: 2,
        }) || "";
      legalRepDoc =
        readValue(lines, /^(n[uú]mero de identificaci[oó]n|c[eé]dula)/i, {
          from: repIndex,
          max: 1,
        }) || "";
    }
  }

  const taxResponsibilities = parseResponsibilities(lines);
  const pointsOfSale = parsePointsOfSale(lines);

  const detected: string[] = [];
  if (name) detected.push("Razón social");
  if (nit) detected.push("NIT");
  if (address) detected.push("Dirección");
  if (department) detected.push("Departamento");
  if (city) detected.push("Ciudad");
  if (phone) detected.push("Teléfono");
  if (email) detected.push("Correo");
  if (economicActivity) detected.push("Actividad económica");
  if (taxResponsibilities) detected.push("Responsabilidades");
  if (legalRep) detected.push("Representante legal");
  if (pointsOfSale.length > 0)
    detected.push(`${pointsOfSale.length} establecimientos`);

  return {
    name,
    nit,
    department,
    city,
    address,
    phone,
    email,
    economicActivity,
    taxResponsibilities,
    legalRep,
    legalRepDoc,
    pointsOfSale,
    detected,
  };
};
