import { GoogleGenAI } from '@google/genai';
import { RawJob } from '../types/job.js';
import { matchesWhitelist, matchesBlacklist, cleanJobTitle } from '../config/jobFilters.js';
import { parseSalary } from './candidateMatcher.js';

export interface EvaluationResult {
  isTechSoftware?: boolean;
  requiredSeniority?: string;
  techStack?: string[];
  workModel?: string;
  location?: string;
  salary?: string;
  category: string;
  extractedRole?: string;
  contractType?: string;
  applicationChannel?: string;
  directContact?: string;
  reasoning: string;
  // Campos mantidos para retrocompatibilidade
  isJuniorFullStack: boolean;
  overallScore: number;
  score?: number;
  stackScore: number;
  seniorityScore: number;
  locationScore: number;
  gaps: string[];
  resumeTips: string;
}

export class HermesEvaluator {
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.HERMES_API_KEY;

    if (apiKey) {
      this.client = new GoogleGenAI({
        apiKey,
      });
    }
  }

  private buildNonTechResult(job: RawJob, reasoning: string): EvaluationResult {
    return {
      isTechSoftware: false,
      requiredSeniority: 'Não especificado',
      techStack: [],
      workModel: 'Presencial',
      location: job.location || 'Não informada',
      salary: 'Não informado',
      category: 'Não-Tech',
      extractedRole: job.title,
      contractType: 'Não informado',
      applicationChannel: 'Não informado',
      directContact: undefined,
      reasoning,
      isJuniorFullStack: false,
      overallScore: 0,
      score: 0,
      stackScore: 0,
      seniorityScore: 0,
      locationScore: 0,
      gaps: [],
      resumeTips: '',
    };
  }

  public async evaluate(job: RawJob): Promise<EvaluationResult> {
    // 1. Verificação prévia mandatória antes de chamar a IA:
    // Se o título estiver na blacklist ou não possuir termo técnico de whitelist, rejeita de imediato
    const blacklistCheck = matchesBlacklist(job.title);
    if (blacklistCheck.matched) {
      return this.buildNonTechResult(job, `Rejeitada via Blacklist: ${blacklistCheck.term || job.title}`);
    }

    const whitelistCheck = matchesWhitelist(job.title);
    if (!whitelistCheck.matched) {
      return this.buildNonTechResult(job, `Rejeitada: Título sem termos técnicos de TI/Software (${job.title})`);
    }

    if (!this.client) {
      return this.evaluateHeuristic(job);
    }

    try {
      const prompt = `
Você é um classificador e analisador técnico de alta precisão especializado no mercado de Tecnologia da Informação e Engenharia de Software.
Sua missão é extrair metadados neutros, precisos e objetivos da vaga anunciada para abastecer uma plataforma de empregos multi-candidato.

DIRETRIZES FUNDAMENTAIS:
1. VALIDAÇÃO DE ESCOPO TECH (isTechSoftware):
   - Defina isTechSoftware = true SE E SOMENTE SE a oportunidade for estritamente do setor técnico de tecnologia/software:
     • Desenvolvimento / Engenharia de Software (Full Stack, Backend, Frontend, Mobile, Web, Embarcados/IoT, etc.)
     • Engenharia / Ciência de Dados, BI, Analytics, Inteligência Artificial / ML
     • DevOps, SRE, Cloud, Infraestrutura de TI, Redes, Administração de Sistemas
     • QA, Testes de Software, Automação de Qualidade
     • Segurança da Informação, CyberSec, AppSec
     • Produto e Design Tech (Product Manager Tech, Product Owner Tech, UI/UX Designer)
   - ATENÇÃO ESTREITA ANTI-FALSO-POSITIVO:
     Defina isTechSoftware = false explicitamente para funções NÃO-técnicas, MESMO QUE anunciadas por empresas de tecnologia, SaaS ou startups:
     • Vendas B2B, SDR, BDR, Inside Sales, Executivo de Contas, Comercial, Vendedor
     • Recrutador, Tech Recruiter, Headhunter, Talent Acquisition, RH, Departamento Pessoal
     • Financeiro, Contabilidade, Fiscal, Jurídico, Compliance, Administrativo, Secretariado
     • Suporte Nível 1 / Atendimento ao Cliente / SAC / Help Desk operacional
     • Marketing Digital operacional, Social Media, Copywriter, Redator
     • Cargos operacionais gerais (motorista, balconista, estoquista, ajudante, usinagem, CNC)

2. CATEGORIZAÇÃO TÉCNICA (category):
   - Classifique estritamente em: "Frontend", "Backend", "Full Stack", "DevOps", "Data", "Mobile", "QA", "IoT & Embarcados", "Security", "Product & UI/UX" ou "Other" (se isTechSoftware for false).

3. NÍVEL DE SENIORIDADE REQUERIDO (requiredSeniority):
   - Classifique estritamente em: "Estágio", "Júnior", "Pleno", "Sênior", "Especialista / Tech Lead" ou "Não especificado".

4. TECH STACK (techStack):
   - Array com as tecnologias, linguagens, frameworks, bibliotecas, bancos e ferramentas de TI citadas no texto.

5. MODELO DE TRABALHO & LOCALIZAÇÃO:
   - workModel: "Remoto", "Híbrido", "Presencial" ou "Não informado".
   - location: Cidade e Estado identificados (ou "Remoto", "Brasil", etc.).

6. SOBERANIA DO CONTATO DIRETO (directContact):
   - Se houver e-mail de contato direto ou instrução de envio por DM/privado, extraia estritamente esse e-mail ou instrução. NUNCA insira URLs de ATS (Gupy, Greenhouse, etc.). Se não houver, retorne string vazia "".

Vaga a ser analisada:
- Título: ${job.title}
- Empresa: ${job.company}
- Localização indicada: ${job.location || 'Não informada'}
- Descrição: ${job.description}

Responda APENAS em formato JSON no seguinte formato:
{
  "isTechSoftware": boolean,
  "category": "Frontend" | "Backend" | "Full Stack" | "DevOps" | "Data" | "Mobile" | "QA" | "IoT & Embarcados" | "Security" | "Product & UI/UX" | "Other",
  "extractedRole": string,
  "requiredSeniority": "Estágio" | "Júnior" | "Pleno" | "Sênior" | "Especialista / Tech Lead" | "Não especificado",
  "techStack": string[],
  "workModel": "Remoto" | "Híbrido" | "Presencial" | "Não informado",
  "location": string,
  "contractType": string,
  "applicationChannel": string,
  "salary": string,
  "directContact": string,
  "reasoning": "Resumo analítico neutro e objetivo de 1 a 2 frases da oportunidade técnica."
}
`;

      let modelName = process.env.HERMES_MODEL || 'gemini-2.5-flash';
      if (modelName.includes('gpt')) {
        modelName = 'gemini-2.5-flash';
      }

      const response = await this.client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const content = response.text;
      if (content) {
        const parsed = JSON.parse(content);
        const isTechSoftware = Boolean(parsed.isTechSoftware);
        if (!isTechSoftware) {
          return this.buildNonTechResult(job, parsed.reasoning || 'Vaga fora do escopo de TI/Software');
        }

        const category = isTechSoftware ? String(parsed.category || 'Full Stack') : 'Other';
        const requiredSeniority = String(parsed.requiredSeniority || 'Não especificado');
        const techStack = Array.isArray(parsed.techStack) ? parsed.techStack.map(String) : [];
        const workModel = String(parsed.workModel || 'Não informado');
        const locationStr = parsed.location ? String(parsed.location) : job.location || 'Não informada';
        const salary = parsed.salary ? String(parsed.salary) : 'Não informado';
        const reasoning = String(parsed.reasoning || (isTechSoftware ? 'Vaga técnica avaliada via Hermes IA' : 'Vaga fora do escopo de TI'));

        const isJuniorFullStack = isTechSoftware && (
          requiredSeniority.toLowerCase().includes('júnior') ||
          requiredSeniority.toLowerCase().includes('junior') ||
          requiredSeniority.toLowerCase().includes('estágio') ||
          requiredSeniority.toLowerCase().includes('estagio') ||
          requiredSeniority.toLowerCase().includes('não especificado')
        );

        const overallScore = isTechSoftware ? 90 : 0;

        return {
          isTechSoftware,
          requiredSeniority,
          techStack,
          workModel,
          location: locationStr,
          salary,
          category,
          extractedRole: parsed.extractedRole ? String(parsed.extractedRole) : job.title,
          contractType: parsed.contractType ? String(parsed.contractType) : 'Não informado',
          applicationChannel: parsed.applicationChannel ? String(parsed.applicationChannel) : 'Não informado',
          directContact: parsed.directContact && String(parsed.directContact).trim() !== '' ? String(parsed.directContact).trim() : undefined,
          reasoning,
          isJuniorFullStack,
          overallScore,
          score: overallScore,
          stackScore: techStack.length > 0 ? 80 : 50,
          seniorityScore: 80,
          locationScore: workModel.toLowerCase().includes('remoto') ? 100 : 70,
          gaps: [],
          resumeTips: '',
        };
      }
    } catch (err) {
      console.warn(`[HermesEvaluator] Erro na API Gemini para "${job.title}". Usando fallback heurístico:`, (err as Error).message);
    }

    return this.evaluateHeuristic(job);
  }

  public evaluateHeuristic(job: RawJob): EvaluationResult {
    const cleanTitle = cleanJobTitle(job.title);
    const text = `${cleanTitle} ${job.description}`.toLowerCase();
    const titleLower = cleanTitle.toLowerCase();

    // 1. FILTRO ANTI-FALSO-POSITIVO (NÃO-TECH / SUPORTE / VENDAS / RH / ENGENHARIAS NÃO-SOFTWARE / CNC)
    const blacklistResult = matchesBlacklist(job.title);
    if (blacklistResult.matched) {
      return this.buildNonTechResult(job, `Rejeitada via Heurística (Blacklist): ${blacklistResult.term || job.title}`);
    }

    // 2. VALIDAÇÃO TECH MANDATÓRIA (WHITELIST DE TÍTULO TÉCNICO)
    const whitelistResult = matchesWhitelist(job.title);
    if (!whitelistResult.matched) {
      return this.buildNonTechResult(job, `Rejeitada via Heurística: Título sem termos de tecnologia/software reconhecidos (${job.title})`);
    }

    const isTechSoftware = true;

    // 3. DETECÇÃO DE SENIORIDADE
    let requiredSeniority = 'Não especificado';
    if (/\b(est[aá]gio|estagi[aá]rio|intern|trainee)\b/i.test(titleLower)) {
      requiredSeniority = 'Estágio';
    } else if (/\b(j[uú]nior|jr|entry level|iniciante)\b/i.test(titleLower)) {
      requiredSeniority = 'Júnior';
    } else if (/\b(pleno|mid|pl)\b/i.test(titleLower)) {
      requiredSeniority = 'Pleno';
    } else if (/\b(s[eê]nior|sr|senior)\b/i.test(titleLower)) {
      requiredSeniority = 'Sênior';
    } else if (/\b(lead|tech lead|especialista|specialist|architect|arquiteto|staff|principal)\b/i.test(titleLower)) {
      requiredSeniority = 'Especialista / Tech Lead';
    } else if (/\b(s[eê]nior|sr|senior)\b/i.test(text)) {
      requiredSeniority = 'Sênior';
    } else if (/\b(pleno|mid)\b/i.test(text)) {
      requiredSeniority = 'Pleno';
    } else if (/\b(j[uú]nior|jr)\b/i.test(text)) {
      requiredSeniority = 'Júnior';
    }

    // 4. CATEGORIZAÇÃO TÉCNICA
    let category = 'Software Geral';
    if (/esp32|esp8266|arduino|raspberry|iot|mqtt|home assistant|embarcados|sistemas embarcados/i.test(text)) {
      category = 'IoT & Embarcados';
    } else if (/react native|flutter|mobile|android|ios|swift|kotlin/i.test(text)) {
      category = 'Mobile';
    } else if (/\b(devops|sre|cloud|kubernetes|docker|terraform|infraestrutura|sysadmin)\b/i.test(text)) {
      category = 'DevOps';
    } else if (/\b(data engineer|data science|data scientist|analytics|analista de bi|machine learning|intelig[eê]ncia artificial|ia\b|engenheiro de dados|cientista de dados)\b/i.test(text)) {
      category = 'Data';
    } else if (/\b(qa|qualidade de software|testes|tester|cypress|selenium)\b/i.test(text)) {
      category = 'QA';
    } else if (/\b(security|seguran[cç]a da informa[cç][aã]o|cybersec|pentest|appsec)\b/i.test(text)) {
      category = 'Security';
    } else if (/\b(product manager|product owner|ui\/ux|ux designer|ui designer)\b/i.test(text)) {
      category = 'Product & UI/UX';
    } else if (/full\s*stack|fullstack|full-stack/i.test(text) || (/frontend|front-end/i.test(text) && /backend|back-end/i.test(text))) {
      category = 'Full Stack';
    } else if (/frontend|front-end|front end/i.test(text) && !/backend|back-end/i.test(text)) {
      category = 'Frontend';
    } else if (/backend|back-end|back end/i.test(text) && !/frontend|front-end/i.test(text)) {
      category = 'Backend';
    } else {
      category = 'Software Geral';
    }

    // 5. EXTRAÇÃO DE STACKS TÉCNICAS
    const commonTechs = [
      'javascript', 'typescript', 'node.js', 'react', 'next.js', 'vue', 'angular',
      'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'c#', '.net',
      'php', 'laravel', 'golang', 'ruby', 'rails', 'rust', 'c++', 'c',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'graphql',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'linux',
      'esp32', 'arduino', 'mqtt', 'flutter', 'react native'
    ];

    const techStack: string[] = [];
    for (const tech of commonTechs) {
      const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![a-zA-Z0-9_-])${escaped}(?![a-zA-Z0-9_-])`, 'i');
      if (regex.test(text)) {
        techStack.push(tech);
      }
    }

    // 6. MODELO DE TRABALHO
    let workModel = 'Presencial';
    if (/remoto|remote|home office|teletrabalho|anywhere/i.test(text) || /remoto|home office/i.test(job.location || '')) {
      workModel = 'Remoto';
    } else if (/h[ií]brido|hybrid/i.test(text) || /h[ií]brido/i.test(job.location || '')) {
      workModel = 'Híbrido';
    }

    // 7. EXTRAÇÃO DE SALÁRIO & CONTATO DIRETO
    const salary = parseSalary(job.description ? job.description.match(/(?:r\$|sal[áa]rio:?)\s*[\d.,k\s-]+/i)?.[0] : null);
    const salaryStr = salary ? `R$ ${salary.min}${salary.max !== salary.min ? ` - R$ ${salary.max}` : ''}` : 'Não informado';

    const rawText = `${job.title} ${job.description}`;
    const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/gi);
    const directContact = emailMatch ? emailMatch[0] : undefined;

    const isJuniorFullStack = isTechSoftware && (requiredSeniority === 'Júnior' || requiredSeniority === 'Estágio' || requiredSeniority === 'Não especificado');
    const overallScore = isTechSoftware ? 85 : 0;

    const reasoning = `Aprovada via Heurística: Vaga técnica de ${category} (Nível: ${requiredSeniority}, Modelo: ${workModel}). ${techStack.length} tecnologias detectadas.`;

    return {
      isTechSoftware,
      requiredSeniority,
      techStack,
      workModel,
      location: job.location || 'Não informada',
      salary: salaryStr,
      category,
      extractedRole: job.title,
      contractType: 'Não informado',
      applicationChannel: 'Não informado',
      directContact,
      reasoning,
      isJuniorFullStack,
      overallScore,
      score: overallScore,
      stackScore: techStack.length > 0 ? 80 : 50,
      seniorityScore: 80,
      locationScore: workModel === 'Remoto' ? 100 : 70,
      gaps: [],
      resumeTips: '',
    };
  }
}
