import type {
  Company,
  ContractType,
  DocumentKind,
  Employee,
} from "@/data/types";
import { formatCOP, formatDateLong, fullName, numberToWords } from "@/lib/format";
import {
  drawLetterhead,
  finishLetterhead,
  letterheadBottom,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";

export interface DocumentSection {
  heading: string;
  body: string[];
}

export interface DocumentContent {
  title: string;
  subtitle: string;
  meta: { label: string; value: string }[];
  sections: DocumentSection[];
  footer: string;
  signature?: string;
  signatureName?: string;
}

export interface DocumentOptions {
  amount?: number;
  termMonths?: number;
  interest?: number;
  obligations?: string;
  terminationDate?: string;
}

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  "contrato-indefinido": "Contrato a término indefinido",
  "contrato-fijo": "Contrato a término fijo",
  "contrato-obra-labor": "Contrato por obra o labor",
  "contrato-prestacion-servicios": "Contrato de prestación de servicios",
  pagare: "Pagaré",
  confidencialidad: "Acuerdo de confidencialidad",
  "politica-ventas": "Política de venta exclusiva en puntos de venta",
  "acuerdo-terminacion": "Acuerdo de terminación por mutuo acuerdo",
  "carta-renuncia": "Carta de renuncia",
};

export const contractTypeForDocument = (
  kind: DocumentKind,
): ContractType | null => {
  switch (kind) {
    case "contrato-indefinido":
      return "indefinido";
    case "contrato-fijo":
      return "fijo";
    case "contrato-obra-labor":
      return "obra-labor";
    case "contrato-prestacion-servicios":
      return "prestacion-servicios";
    default:
      return null;
  }
};

export const documentKindForContract = (
  contractType: ContractType,
): DocumentKind => {
  switch (contractType) {
    case "fijo":
      return "contrato-fijo";
    case "obra-labor":
      return "contrato-obra-labor";
    case "prestacion-servicios":
      return "contrato-prestacion-servicios";
    default:
      return "contrato-indefinido";
  }
};

/** Verifica si el empleado ya tiene generado el contrato de su tipo. */
export const hasGeneratedContract = (
  employee: Employee,
  documents: { employeeId: string; kind: string }[],
) =>
  documents.some(
    (document) =>
      document.employeeId === employee.id &&
      document.kind === documentKindForContract(employee.contractType),
  );

const contractLabels: Record<ContractType, string> = {
  indefinido: "término indefinido",
  fijo: "término fijo",
  "obra-labor": "obra o labor contratada",
  "prestacion-servicios": "prestación de servicios",
};

const DISCLAIMER =
  "Este documento es un modelo de trabajo. Antes de su firma debe ser revisado por la asesoría jurídica de la empresa y contrastado con la normatividad vigente.";

const posOf = (company: Company, employee: Employee) => {
  const pos = company.pointsOfSale.find(
    (item) => item.id === employee.pointOfSaleId,
  );
  return pos
    ? `${pos.name} — ${pos.address}, ${pos.city}`
    : `${company.address}, ${company.city}`;
};

const parties = (company: Company, employee: Employee) => {
  const workerType =
    employee.contractType === "prestacion-servicios"
      ? "CONTRATISTA"
      : "TRABAJADOR";
  return {
    employer: `EMPRESA: ${company.name}, NIT ${company.nit}, con domicilio en ${company.address}, ${company.city}, representada legalmente por ${company.legalRep}, identificado(a) con ${company.legalRepDoc}.`,
    worker: `${workerType}: ${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, domiciliado(a) en ${employee.address}, ${employee.city}, correo electrónico ${employee.email}.`,
  };
};

const salaryClause = (company: Company, employee: Employee): string[] => {
  if (employee.contractType === "prestacion-servicios") {
    return [
      `El valor de los honorarios mensuales se pacta en ${formatCOP(employee.salary)}, pagaderos dentro de los cinco (5) primeros días del mes siguiente a la prestación del servicio, previa presentación de cuenta de cobro. El contratista es responsable de sus aportes al Sistema de Seguridad Social y de las obligaciones tributarias derivadas de sus ingresos.`,
    ];
  }

  const smmlv = company.params.smmlv;
  const ratio = smmlv > 0 ? employee.salary / smmlv : 1;
  const salaryLabel =
    Math.abs(ratio - 1) < 0.01
      ? `UN (1) SALARIO MÍNIMO LEGAL MENSUAL VIGENTE (SMLMV), esto es, ${formatCOP(employee.salary)} mensuales`
      : `${formatCOP(employee.salary)} (${numberToWords(employee.salary)} pesos M/CTE), equivalente a ${ratio.toLocaleString("es-CO", { maximumFractionDigits: 2 })} salarios mínimos legales mensuales vigentes (SMLMV)`;

  const parts = [
    `El EMPLEADOR pagará al TRABAJADOR, como contraprestación por sus servicios, un salario básico mensual equivalente a ${salaryLabel}, de conformidad con la legislación laboral colombiana.`,
    employee.integralSalary
      ? "Las partes acuerdan un salario integral que incluye el pago de prestaciones sociales, recargos y demás conceptos, conforme al artículo 132 del Código Sustantivo del Trabajo."
      : "",
    "Adicionalmente, el EMPLEADOR reconocerá y pagará el auxilio legal de transporte vigente, siempre que el TRABAJADOR cumpla con los requisitos establecidos por la ley. Este auxilio no constituye salario, pero será tenido en cuenta para la liquidación de las prestaciones sociales en los casos legalmente previstos.",
    "El salario será pagado en moneda legal colombiana, por períodos vencidos, mediante transferencia bancaria a una cuenta de titularidad del TRABAJADOR, con la periodicidad y dentro de los plazos establecidos por la legislación laboral vigente.",
    "Las horas extras, comisiones y recargos nocturnos, dominicales y festivos, cuando se causen, serán reconocidos y liquidados conforme a las disposiciones legales aplicables. Los conceptos que legalmente constituyan salario serán incluidos en las bases de liquidación correspondientes.",
    "El EMPLEADOR efectuará únicamente las deducciones autorizadas por la legislación vigente.",
    "PARÁGRAFO. ACTUALIZACIÓN SALARIAL: El salario básico y el auxilio legal de transporte se ajustarán conforme a los valores y condiciones establecidos por el Gobierno Nacional para cada anualidad, sin necesidad de suscribir modificaciones al presente contrato.",
  ].filter((part) => part.length > 0);

  return parts;
};

const commonObligations = (company: Company) => ({
  employer: [
    `Pagar la remuneración pactada en las condiciones acordadas y dentro de los plazos legales.`,
    `Afiliar al trabajador a los sistemas de salud, pensión, riesgos laborales y caja de compensación familiar, y efectuar los aportes a su cargo.`,
    `Proporcionar los elementos, herramientas y condiciones de seguridad y salud en el trabajo necesarias para el desempeño de las funciones.`,
    `Guardar la reserva de la información personal y someter el tratamiento de datos a la Ley 1581 de 2012 y a la política de tratamiento de datos de ${company.name}.`,
    `Expedir certificaciones laborales y cumplir las demás obligaciones del artículo 57 del Código Sustantivo del Trabajo.`,
  ],
  worker: [
    `Cumplir con diligencia y buena fe las funciones asignadas, las instrucciones del empleador y los protocolos internos.`,
    `Cumplir la jornada pactada y registrar oportunamente el ingreso y la salida, así como las novedades de tiempo.`,
    `Utilizar el uniforme y los elementos de trabajo suministrados, y responder por su cuidado y conservación.`,
    `Guardar absoluta reserva sobre la información de la empresa, sus clientes, proveedores, precios, márgenes y estrategias comerciales, incluso después de terminada la relación laboral.`,
    `Vender la mercancía únicamente en los puntos de venta autorizados por la empresa, siguiendo la política de venta exclusiva en puntos de venta.`,
    `Observar las normas de seguridad y salud en el trabajo, y reportar de inmediato los riesgos o accidentes.`,
    `Abstenerse de ejecutar actos que afecten la imagen de la empresa o que constituyan competencia desleal.`,
  ],
});

export const buildDocument = (
  kind: DocumentKind,
  employee: Employee,
  company: Company,
  options: DocumentOptions = {},
): DocumentContent => {
  const party = parties(company, employee);
  const obligations = commonObligations(company);
  const place = posOf(company, employee);
  const today = formatDateLong(new Date().toISOString().slice(0, 10));

  if (kind === "pagare") {
    const amount = options.amount ?? 1_500_000;
    const term = options.termMonths ?? 12;
    const interest = options.interest ?? 1.8;
    return {
      title: "PAGARÉ",
      subtitle: `No. PAG-${employee.docNumber.replace(/\D/g, "").slice(-6)}-${new Date().getFullYear()}`,
      meta: [
        { label: "Deudor", value: fullName(employee) },
        { label: "Documento", value: `${employee.docType} ${employee.docNumber}` },
        { label: "Valor", value: formatCOP(amount) },
        { label: "Plazo", value: `${term} meses` },
      ],
      sections: [
        {
          heading: "Identificación del deudor",
          body: [
            `Yo, ${fullName(employee)}, mayor de edad, identificado(a) con ${employee.docType} ${employee.docNumber}, con domicilio en ${employee.address}, ${employee.city}, en calidad de deudor, y ${company.name}, NIT ${company.nit}, representada por ${company.legalRep}, en calidad de beneficiaria, suscribimos el presente pagaré.`,
          ],
        },
        {
          heading: "Primera. Promesa incondicional de pago",
          body: [
            `Debo y pagaré incondicionalmente a la orden de ${company.name}, o a quien sus derechos represente, la suma de ${formatCOP(amount)} (${numberToWords(amount)} pesos colombianos), en la ciudad de ${company.city}, en la fecha de vencimiento acordada por las partes.`,
          ],
        },
        {
          heading: "Segunda. Plazo y lugar de pago",
          body: [
            `El plazo para el pago total es de ${term} meses contados a partir de la fecha de suscripción. El pago se realizará en el domicilio de la beneficiaria o mediante descuento autorizado sobre el salario, previa autorización escrita del deudor y dentro de los límites del artículo 149 del Código Sustantivo del Trabajo.`,
          ],
        },
        {
          heading: "Tercera. Intereses y mora",
          body: [
            `Sobre el saldo insoluto se causarán intereses remuneratorios a la tasa del ${interest}% mensual, sin exceder la tasa de usura certificada por la Superintendencia Financiera de Colombia. En caso de mora, el deudor pagará intereses moratorios a la tasa máxima legal permitida, junto con los gastos de cobranza.`,
          ],
        },
        {
          heading: "Cuarta. Cláusula aceleratoria",
          body: [
            "El incumplimiento de cualquiera de las cuotas pactadas faculta a la beneficiaria para declarar vencido el plazo y exigir el pago total del saldo pendiente, sin necesidad de requerimiento previo.",
          ],
        },
        {
          heading: "Quinta. Autorización de descuento y tratamiento de datos",
          body: [
            `El deudor autoriza a ${company.name} a descontar de sus pagos laborales las cuotas pactadas, y autoriza el tratamiento de sus datos personales para la administración del crédito, conforme a la Ley 1581 de 2012.`,
          ],
        },
        {
          heading: "Firma del deudor",
          body: [
            `Se firma en ${company.city}, a los ${today}.`,
            `\n\n{{firma:trabajador}}\n${fullName(employee)}\n${employee.docType} ${employee.docNumber}`,
          ],
        },
      ],
      signature: employee.signatureData || "",
    signatureName: fullName(employee),
    footer: DISCLAIMER,
    };
  }

  if (kind === "carta-renuncia") {
    const lastDay =
      options.terminationDate ||
      employee.endDate ||
      new Date().toISOString().slice(0, 10);
    return {
      title: "CARTA DE RENUNCIA",
      subtitle: "Renuncia voluntaria al cargo",
      meta: [
        { label: "Empleador", value: company.name },
        { label: "Colaborador", value: fullName(employee) },
        { label: "Cargo", value: employee.position },
        { label: "Último día laborado", value: formatDateLong(lastDay) },
      ],
      sections: [
        {
          heading: "Ciudad y fecha",
          body: [`${company.city}, ${today}`],
        },
        {
          heading: "Señores",
          body: [
            `${company.name}\nAtn: ${company.legalRep}\n${company.address}, ${company.city}`,
          ],
        },
        {
          heading: "Asunto: renuncia voluntaria",
          body: [
            `Por medio de la presente, yo ${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, presento mi renuncia voluntaria e irrevocable al cargo de ${employee.position}, que vengo desempeñando desde el ${formatDateLong(employee.startDate)}.`,
            `Mi último día de trabajo será el ${formatDateLong(lastDay)}.`,
          ],
        },
        {
          heading: "Manifestación",
          body: [
            "Mi decisión de renunciar es libre, consciente y voluntaria, y no obedece a presión o solicitud de la empresa.",
            "Solicito que se realice la liquidación de salarios, prestaciones sociales y vacaciones causadas hasta mi último día de trabajo, dentro de los términos legales, así como la expedición de mi certificado laboral.",
          ],
        },
        {
          heading: "Agradecimiento",
          body: [
            "Agradezco a la empresa por la oportunidad de haber formado parte de su equipo y por el apoyo recibido durante mi vinculación.",
          ],
        },
        {
          heading: "Firma del trabajador",
          body: [
            `\n\n{{firma:trabajador}}\n${fullName(employee)}\n${employee.docType} ${employee.docNumber}`,
          ],
        },
        {
          heading: "Recibido por la empresa",
          body: [
            `Recibido en ${company.city}, el ${today}.`,
            `\n\n{{firma:empleador}}\n${company.legalRep}\nRepresentante legal — ${company.name}`,
          ],
        },
      ],
      signature: employee.signatureData || "",
      signatureName: `${company.legalRep} — Recibido por ${company.name}`,
      footer: DISCLAIMER,
    };
  }

  if (kind === "acuerdo-terminacion") {
    const endDate =
      options.terminationDate || new Date().toISOString().slice(0, 10);
    return {
      title: "ACUERDO DE TERMINACIÓN DEL CONTRATO DE TRABAJO POR MUTUO ACUERDO",
      subtitle: "Terminación por mutuo consentimiento · Artículo 61 del C.S.T.",
      meta: [
        { label: "Empleador", value: company.name },
        { label: "Colaborador", value: fullName(employee) },
        { label: "Cargo", value: employee.position },
        { label: "Terminación", value: formatDateLong(endDate) },
      ],
      sections: [
        {
          heading: "Comparecencia",
          body: [party.employer, party.worker],
        },
        {
          heading: "Primera. Antecedentes",
          body: [
            `El colaborador se encuentra vinculado a la empresa mediante contrato de trabajo a ${contractLabels[employee.contractType]}, desempeñando el cargo de ${employee.position}, con fecha de ingreso ${formatDateLong(employee.startDate)} y una remuneración mensual de ${formatCOP(employee.salary)}.`,
          ],
        },
        {
          heading: "Segunda. Terminación por mutuo acuerdo",
          body: [
            `De conformidad con el artículo 61 literal a) del Código Sustantivo del Trabajo, las partes, de manera libre, voluntaria y sin presión alguna, acuerdan dar por terminado el contrato de trabajo por mutuo consentimiento a partir del ${formatDateLong(endDate)}.`,
            "La terminación no obedece a una justa causa imputable a ninguna de las partes y se formaliza por escrito en este acuerdo, con el fin de dejar constancia de la voluntad común de terminarlo.",
          ],
        },
        {
          heading: "Tercera. Liquidación de acreencias",
          body: [
            `La empresa pagará al colaborador los salarios, la prima de servicios, las cesantías y sus intereses, las vacaciones causadas y no disfrutadas, y demás acreencias laborales causadas hasta la fecha de terminación, dentro de los términos legales.`,
            "Al tratarse de una terminación por mutuo acuerdo, no hay lugar al pago de indemnización por despido sin justa causa.",
          ],
        },
        {
          heading: "Cuarta. Paz y salvo y entrega de elementos",
          body: [
            "Una vez efectuado el pago, el colaborador otorgará paz y salvo por todo concepto derivado del contrato y devolverá los elementos, uniformes, herramientas, documentos y accesos de la empresa que tenga en su poder.",
          ],
        },
        {
          heading: "Quinta. Voluntariedad y efectos",
          body: [
            "Las partes declaran que este acuerdo se celebra sin coacción, engaño o vicio del consentimiento, que fue leído y comprendido, y que no queda pendiente reclamación alguna distinta de las acreencias aquí señaladas.",
            "El presente documento se firma en dos ejemplares de igual valor, uno para cada parte.",
          ],
        },
        {
          heading: "Sexta. Firmas",
          body: [
            `Se firma en ${company.city}, a los ${today}.`,
            `\n\n{{firma:empleador}}\n${company.legalRep}\nRepresentante legal — ${company.name}\nNIT ${company.nit}`,
            `\n\n{{firma:trabajador}}\n${fullName(employee)}\n${employee.docType} ${employee.docNumber}`,
          ],
        },
      ],
      signature: employee.signatureData || "",
      signatureName: fullName(employee),
      footer: DISCLAIMER,
    };
  }

  if (kind === "confidencialidad") {
    return {
      title: "ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN",
      subtitle: "Protección de la información de la empresa y de sus clientes",
      meta: [
        { label: "Colaborador", value: fullName(employee) },
        { label: "Cargo", value: employee.position },
        { label: "Empresa", value: company.name },
        { label: "Fecha", value: today },
      ],
      sections: [
        {
          heading: "Comparecencia",
          body: [party.employer, party.worker],
        },
        {
          heading: "Primera. Información confidencial",
          body: [
            "Se considera información confidencial toda la información que el colaborador conozca con ocasión de su vinculación, entre ella: precios de compra y venta, márgenes, listas de proveedores, contratos, estrategias comerciales, planos y diseños, inventarios, bases de datos de clientes, información financiera, procesos internos, políticas de descuento y cualquier dato no público de la empresa o de terceros con quienes esta tenga relaciones.",
            "También tendrá esa calidad la información personal de clientes y colaboradores, cuyo tratamiento se sujetará a la Ley 1581 de 2012 y a la política de tratamiento de datos de la empresa.",
          ],
        },
        {
          heading: "Segunda. Obligaciones del colaborador",
          body: [
            "Usar la información exclusivamente para el cumplimiento de sus funciones y no para fines propios o de terceros.",
            "No divulgar, publicar, transmitir ni reproducir la información por ningún medio, incluidos redes sociales, dispositivos personales o servicios de mensajería.",
            "Mantener la reserva de claves, accesos a sistemas, cajas, inventarios y documentos físicos, y no compartirlos con terceros.",
            "Reportar de inmediato cualquier pérdida, acceso no autorizado o incidente de seguridad.",
            "Devolver a la empresa, al terminar la relación, todos los documentos, equipos, uniformes y soportes que contengan información confidencial, y eliminar las copias que conserve.",
          ],
        },
        {
          heading: "Tercera. Excepciones",
          body: [
            "No es confidencial la información que sea de dominio público, la que la empresa autorice por escrito para divulgar, o la que deba entregarse por orden de autoridad competente, en cuyo caso el colaborador informará previamente a la empresa.",
          ],
        },
        {
          heading: "Cuarta. Vigencia",
          body: [
            "Este acuerdo rige desde la firma y se mantiene durante toda la relación con la empresa y por cinco (5) años después de su terminación, sin perjuicio de las obligaciones legales de reserva que subsistan.",
          ],
        },
        {
          heading: "Quinta. Consecuencias del incumplimiento",
          body: [
            "El incumplimiento faculta a la empresa para iniciar el proceso disciplinario conforme al reglamento interno de trabajo y al Código Sustantivo del Trabajo, y para promover las acciones civiles de indemnización de perjuicios y las penales a que haya lugar, sin que el presente acuerdo constituya una limitación al derecho de defensa.",
          ],
        },
        {
          heading: "Sexta. Ley aplicable y firma",
          body: [
            `Este acuerdo se rige por las leyes colombianas. Se firma en ${company.city}, a los ${today}.`,
            `\n\n{{firma:trabajador}}\n${fullName(employee)}\n${employee.docType} ${employee.docNumber}`,
            `\n\n{{firma:empleador}}\n${company.legalRep}\nRepresentante legal — ${company.name}`,
          ],
        },
      ],
      signature: employee.signatureData || "",
    signatureName: fullName(employee),
    footer: DISCLAIMER,
    };
  }

  if (kind === "politica-ventas") {
    return {
      title: "POLÍTICA DE VENTA EXCLUSIVA EN PUNTOS DE VENTA",
      subtitle: "Canales autorizados, manejo de caja e inventario",
      meta: [
        { label: "Empresa", value: company.name },
        { label: "Colaborador", value: fullName(employee) },
        { label: "Punto de venta", value: place },
        { label: "Fecha", value: today },
      ],
      sections: [
        {
          heading: "Objeto",
          body: [
            `${company.name} establece la presente política interna para garantizar que la venta de mercancía se realice únicamente en los puntos de venta autorizados, con control de caja, inventario y trazabilidad de cada operación. Su cumplimiento es obligatorio para el colaborador firmante y forma parte de sus obligaciones laborales.`,
          ],
        },
        {
          heading: "Primera. Canal autorizado",
          body: [
            `La mercancía se vende exclusivamente en los puntos de venta autorizados por la empresa. Para el colaborador firmante, el punto de venta asignado es: ${place}. Cualquier otro canal requiere autorización escrita de la gerencia.`,
            "Los puntos de venta habilitados son los registrados en el sistema de la empresa. La apertura de un nuevo punto requiere acto administrativo previo y capacitación del personal asignado.",
          ],
        },
        {
          heading: "Segunda. Prohibiciones",
          body: [
            "Vender mercancía por fuera del punto de venta, en domicilios no autorizados, en la calle, en redes sociales, en plataformas digitales o a través de canales personales.",
            "Reservar, apartar o trasladar mercancía sin registro en el sistema y sin autorización del jefe del punto de venta.",
            "Recibir pagos en cuentas personales, billeteras digitales propias o en efectivo sin registrar la venta en la caja.",
            "Otorgar descuentos, bonificaciones o cambios por fuera de las promociones vigentes y de los niveles de autorización definidos.",
            "Vender mercancía a crédito sin la aprobación del área comercial y sin el registro correspondiente.",
          ],
        },
        {
          heading: "Tercera. Manejo de caja",
          body: [
            "Toda venta debe registrarse en el sistema de facturación del punto de venta, entregando el comprobante al cliente.",
            "El colaborador responsable de la caja realiza el arqueo al inicio y al cierre de la jornada, y reporta las diferencias de inmediato al jefe del punto de venta.",
            "Los pagos en efectivo se consignan según el procedimiento de recaudo definido por la empresa. No se permite el uso del efectivo de caja para gastos no autorizados.",
          ],
        },
        {
          heading: "Cuarta. Inventario y traslados",
          body: [
            "El inventario se cuenta al cierre de cada jornada y en los conteos cíclicos programados. Las diferencias se documentan y se escalan al área de operaciones.",
            "Los traslados entre puntos de venta requieren guía interna, autorización y registro en el sistema antes de la salida de la mercancía.",
            "Las prendas o productos con novedad (daño, faltante, devolución) se registran en el formato correspondiente y se separan para su disposición final.",
          ],
        },
        {
          heading: "Quinta. Atención al cliente y devoluciones",
          body: [
            "Las devoluciones y cambios se atienden exclusivamente en el punto de venta donde se realizó la compra, con el comprobante y dentro de los plazos de la política de garantía.",
            "El colaborador no puede prometer condiciones comerciales distintas a las publicadas por la empresa.",
          ],
        },
        {
          heading: "Sexta. Confidencialidad comercial",
          body: [
            "La información de precios, márgenes, inventarios, promociones y clientes es confidencial y se rige por el acuerdo de confidencialidad suscrito con la empresa.",
          ],
        },
        {
          heading: "Séptima. Consecuencias",
          body: [
            "El incumplimiento de esta política dará lugar al proceso disciplinario previsto en el reglamento interno de trabajo, con las sanciones que correspondan según la gravedad, incluida la terminación del contrato cuando la conducta constituya justa causa conforme al artículo 62 del Código Sustantivo del Trabajo.",
            "Cuando la conducta genere pérdidas, la empresa podrá adelantar las acciones de cobro o indemnizatorias a que haya lugar, respetando el debido proceso.",
          ],
        },
        {
          heading: "Aceptación",
          body: [
            `El colaborador declara haber leído, comprendido y aceptado esta política, y se compromete a cumplirla. Se firma en ${company.city}, a los ${today}.`,
            `\n\n{{firma:trabajador}}\n${fullName(employee)}\n${employee.docType} ${employee.docNumber}`,
            `\n\n{{firma:empleador}}\n${company.legalRep}\nRepresentante legal — ${company.name}`,
          ],
        },
      ],
      signature: employee.signatureData || "",
    signatureName: fullName(employee),
    footer: DISCLAIMER,
    };
  }

  const isServices = kind === "contrato-prestacion-servicios";
  const isFixed = kind === "contrato-fijo";
  const workPlace = place;

  const durationClause = isFixed
    ? `El contrato se pacta por un término fijo de ${termInWords(employee)} contados a partir del ${formatDateLong(employee.startDate)}${employee.endDate ? ` y hasta el ${formatDateLong(employee.endDate)}` : ""}. Podrá prorrogarse por escrito antes de su vencimiento; si no se avisa con treinta (30) días de antelación, se entenderá prorrogado en los términos del artículo 46 del Código Sustantivo del Trabajo.`
    : kind === "contrato-obra-labor"
      ? `El contrato se celebra por el tiempo que demande la ejecución de la obra o labor contratada: ${options.obligations ?? `${employee.position} en el punto de venta asignado`}. La duración es la necesaria para completar la obra, sin que pueda superar los tres (3) años, salvo autorización conforme a la ley.`
      : isServices
        ? `El contrato tendrá una duración de ${options.termMonths ?? 12} meses contados a partir del ${formatDateLong(employee.startDate)}, prorrogables por acuerdo escrito entre las partes.`
        : `El contrato se celebra a término indefinido a partir del ${formatDateLong(employee.startDate)} y permanecerá vigente mientras subsistan las causas que le dieron origen.`;

  const headerSections: DocumentSection[] = [
    {
      heading: "Comparecencia",
      body: [party.employer, party.worker],
    },
    {
      heading: "Primera. Objeto",
      body: [
        isServices
          ? `El contratista se obliga a prestar sus servicios profesionales de manera independiente para ${company.name}, sin subordinación ni horario impuesto, conservando autonomía técnica y administrativa en la ejecución del objeto.`
          : `Por el presente contrato individual de trabajo, el trabajador se obliga a prestar sus servicios personales bajo la continua subordinación y dependencia del empleador, en los términos de los artículos 22 y 23 del Código Sustantivo del Trabajo y de la Ley 2466 de 2025, a cambio de una remuneración.`,
      ],
    },
    {
      heading: "Segunda. Cargo, funciones y lugar de trabajo",
      body: [
        isServices
          ? `El contratista ejecutará el objeto contractual relacionado con ${employee.position.toLowerCase()} y responderá por la calidad técnica de los entregables acordados.`
          : `El trabajador desempeñará el cargo de ${employee.position} en el área de ${employee.department}, con las funciones propias del cargo y las que le asigne el empleador dentro de su capacidad y competencia.`,
        isServices
          ? `La ejecución se desarrollará con autonomía, pudiendo el contratista apoyarse en su propio equipo, sin que exista control de horario ni exclusividad, salvo pacto escrito.`
          : `El lugar de trabajo será ${workPlace}. Los traslados dentro de la ciudad se harán conforme a las necesidades del servicio; el cambio de domicilio a otra ciudad requerirá el consentimiento del trabajador, salvo las excepciones legales.`,
      ],
    },
    {
      heading: "Tercera. Jornada",
      body: isServices
        ? [
            "Las partes acuerdan que no existe jornada laboral sujeta a control, por cuanto la ejecución del objeto se realiza de manera autónoma y sin subordinación.",
          ]
        : [
            `La jornada ordinaria será de máximo ${company.params.weeklyHours} horas semanales, distribuidas de común acuerdo según el horario del punto de venta, con los descansos y pausas legales. Las horas que excedan la jornada se reconocerán como extra diurna o nocturna, y los recargos dominicales y festivos se liquidarán en los porcentajes vigentes, con jornada nocturna iniciando a las ${company.params.nightStartHour}:00 horas conforme a la Ley 2466 de 2025.`,
            "El trabajador registrará su ingreso y salida en el mecanismo dispuesto por la empresa. Las novedades de tiempo se reportarán al jefe del punto de venta para su liquidación.",
          ],
    },
    {
      heading: "Cuarta. Salario, auxilio de transporte y forma de pago",
      body: salaryClause(company, employee),
    },
  ];

  const middleSections: DocumentSection[] = isServices
    ? [
        {
          heading: "Quinta. Obligaciones del contratista",
          body: [
            "Ejecutar el objeto con calidad, diligencia y dentro de los plazos acordados.",
            "Cumplir sus obligaciones tributarias y de seguridad social, y entregar los soportes cuando la empresa los solicite.",
            "No usar el nombre, las marcas o la información de la empresa para fines distintos al objeto.",
            "Responder por los daños que cause con su culpa en el desarrollo del contrato.",
            "Suscribir el acuerdo de confidencialidad que forma parte integral de este contrato.",
          ],
        },
        {
          heading: "Sexta. Independencia y ausencia de vínculo laboral",
          body: [
            "Las partes reconocen que no existe vínculo laboral, subordinación ni exclusividad. El contratista no hace parte de la nómina, no recibe prestaciones sociales y organiza su tiempo y medios para la ejecución del objeto. Este contrato no puede usarse para encubrir una relación laboral conforme al artículo 24 del Código Sustantivo del Trabajo.",
          ],
        },
        {
          heading: "Séptima. Terminación",
          body: [
            "Cualquiera de las partes podrá terminar el contrato con aviso previo escrito de treinta (30) días calendario. Si una parte incumple sus obligaciones, la otra podrá darlo por terminado de inmediato y reclamar los perjuicios causados.",
            "Al finalizar, el contratista entregará los entregables pendientes y devolverá la información y los bienes de la empresa.",
          ],
        },
      ]
    : [
        {
          heading: "Quinta. Periodo de prueba",
          body: [
            isFixed
              ? "El periodo de prueba será de dos (2) meses contados desde la fecha de inicio, durante el cual cualquiera de las partes puede terminar el contrato sin indemnización, conforme al artículo 76 del Código Sustantivo del Trabajo."
              : "El periodo de prueba será de dos (2) meses contados desde la fecha de inicio, durante el cual el empleador puede evaluar el desempeño y cualquiera de las partes puede terminar el contrato sin indemnización, conforme al artículo 76 del Código Sustantivo del Trabajo.",
          ],
        },
        {
          heading: "Sexta. Obligaciones del empleador",
          body: obligations.employer,
        },
        {
          heading: "Séptima. Obligaciones del trabajador",
          body: obligations.worker,
        },
        {
          heading: "Octava. Confidencialidad y protección de datos",
          body: [
            "El trabajador se obliga a guardar reserva sobre la información de la empresa, incluidos precios, márgenes, inventarios, proveedores y clientes, durante la relación y después de su terminación. Esta obligación se detalla en el acuerdo de confidencialidad que se suscribe junto con este contrato.",
            "El empleador tratará los datos personales del trabajador conforme a la Ley 1581 de 2012 y a su política de tratamiento de datos, con la finalidad de gestionar la relación laboral, la nómina y las obligaciones de seguridad social.",
          ],
        },
        {
          heading: "Novena. Política de venta en puntos de venta",
          body: [
            "El trabajador declara conocer y aceptar la política de venta exclusiva en puntos de venta, según la cual la mercancía solo puede comercializarse en los canales autorizados, con registro en caja y control de inventario. El incumplimiento se tramitará conforme al reglamento interno de trabajo.",
          ],
        },
        {
          heading: "Décima. Terminación",
          body: [
            "El contrato puede terminarse por mutuo acuerdo, por vencimiento del plazo en el contrato a término fijo, por conclusión de la obra contratada, por renuncia del trabajador o por justa causa conforme a los artículos 62 y 63 del Código Sustantivo del Trabajo, con el procedimiento legal aplicable.",
            "Al terminar, el empleador liquidará salarios, prestaciones sociales y demás acreencias dentro de los plazos legales.",
          ],
        },
      ];

  const closure: DocumentSection[] = [
    {
      heading: isServices
        ? "Octava. Ley aplicable y firma"
        : "Décima primera. Aceptación y firma",
      body: [
        `Las partes declaran que han leído el contrato, que conocen su alcance y que lo aceptan. Se firma en ${company.city}, a los ${today}, en dos ejemplares de igual valor.`,
        `\n\n{{firma:empleador}}\n${company.legalRep}\nRepresentante legal — ${company.name}\nNIT ${company.nit}`,
        `\n\n{{firma:trabajador}}\n${fullName(employee)}\n${employee.docType} ${employee.docNumber}`,
        `\n\nHuella / fecha de firma: ______________________`,
      ],
    },
  ];

  return {
    title: `CONTRATO ${isServices ? "DE PRESTACIÓN DE SERVICIOS" : "INDIVIDUAL DE TRABAJO"}`,
    subtitle: isFixed
      ? "A término fijo"
      : kind === "contrato-obra-labor"
        ? "Por obra o labor contratada"
        : isServices
          ? "Prestación de servicios independientes"
          : "A término indefinido",
    meta: [
      { label: "Empleador", value: company.name },
      { label: "Trabajador", value: fullName(employee) },
      { label: "Cargo", value: employee.position },
      { label: "Inicio", value: formatDateLong(employee.startDate) },
    ],
    sections: [
      ...headerSections,
      ...middleSections,
      ...(company.clauses && company.clauses.trim().length > 0
        ? [
            {
              heading: "Cláusula adicional",
              body: [company.clauses],
            },
          ]
        : []),
      ...closure,
    ],
    signature: employee.signatureData || "",
    signatureName: fullName(employee),
    footer: DISCLAIMER,
  };
};

const termInWords = (employee: Employee) => {
  if (!employee.endDate) return "doce (12) meses";
  const start = new Date(`${employee.startDate}T12:00:00`);
  const end = new Date(`${employee.endDate}T12:00:00`);
  const months = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()),
  );
  return `${months} ${months === 1 ? "mes" : "meses"}`;
};

export const documentToText = (content: DocumentContent) => {
  const lines: string[] = [
    content.title,
    content.subtitle,
    "",
    ...content.meta.map((item) => `${item.label}: ${item.value}`),
    "",
  ];
  content.sections.forEach((section) => {
    lines.push(section.heading.toUpperCase(), "");
    section.body.forEach((paragraph) => lines.push(paragraph, ""));
  });
  lines.push(content.footer);
  return lines.join("\n");
};

export const downloadDocumentPdf = async (
  content: DocumentContent,
  fileName: string,
  company: Company,
  consecutive?: string,
  options: { signed?: boolean } = {},
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;

  const letterhead = () =>
    drawLetterhead(doc, company, {
      title: content.title,
      subtitle: content.subtitle,
      consecutive,
    });

  let cursor = letterhead();

  const ensureSpace = (needed: number) => {
    if (cursor + needed > letterheadBottom(doc)) {
      doc.addPage();
      cursor = letterhead() + 4;
    }
  };

  const signatureSize = (data: string) => {
    try {
      const properties = doc.getImageProperties(data);
      const ratio = Math.min(45 / properties.width, 15 / properties.height);
      return {
        width: properties.width * ratio,
        height: properties.height * ratio,
      };
    } catch {
      return null;
    }
  };

  doc.setTextColor(30);
  doc.setFontSize(9);
  content.meta.forEach((item) => {
    ensureSpace(6);
    doc.text(`${item.label}: ${item.value}`, margin, cursor);
    cursor += 5;
  });
  cursor += 4;

  content.sections.forEach((section) => {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const heading = doc.splitTextToSize(section.heading, maxWidth);
    doc.text(heading, margin, cursor);
    cursor += heading.length * 5 + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    section.body.forEach((paragraph) => {
      const isSignatureBlock =
        /\{\{firma:(empleador|trabajador)\}\}/.test(paragraph);
      const isEmployerBlock = paragraph.includes("{{firma:empleador}}");
      const signature = isEmployerBlock
        ? options.signed
          ? company.signatureData
          : ""
        : content.signature;
      const bodyText = isSignatureBlock
        ? paragraph.replace(/\{\{firma:(empleador|trabajador)\}\}/g, "")
        : paragraph;
      const lines = doc.splitTextToSize(bodyText, maxWidth) as string[];
      let placedSignature = false;
      lines.forEach((line) => {
        const isBlank = line.trim().length === 0;
        if (isSignatureBlock && !placedSignature && !isBlank) {
          const size = signature ? signatureSize(signature) : null;
          ensureSpace(size ? size.height + 6 : 10);
          if (size && signature) {
            doc.addImage(
              signature,
              "PNG",
              margin,
              cursor,
              size.width,
              size.height,
            );
            cursor += size.height + 3;
          } else {
            doc.setDrawColor(90);
            doc.line(margin, cursor + 6, margin + 65, cursor + 6);
            cursor += 10;
          }
          placedSignature = true;
        }
        ensureSpace(5);
        doc.text(line, margin, cursor);
        cursor += 4.6;
      });
      cursor += 2;
    });
    cursor += 2;
  });

  ensureSpace(16);
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  const footer = doc.splitTextToSize(content.footer, maxWidth) as string[];
  footer.forEach((line) => {
    ensureSpace(4);
    doc.text(line, margin, cursor);
    cursor += 3.4;
  });

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, fileName);
};
