import { GoogleGenAI } from '@google/genai';
import { RawJob } from '../types/job.js';
import { matchesWhitelist, matchesBlacklist } from '../config/jobFilters.js';
import { evaluateSeniorityDistance, parseSalary } from './candidateMatcher.js';

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

  public async evaluate(job: RawJob): Promise<EvaluationResult> {
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
     • Cargos operacionais gerais (motorista, balconista, estoquista, ajudante)

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

      let modelName = process.env.HERMES_MODEL || 'gemini-flash-latest';
      if (modelName.includes('gpt')) {
        modelName = 'gemini-flash-latest';
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
    const text = `${job.title} ${job.description}`.toLowerCase();
    const titleLower = job.title.toLowerCase();

    // 1. FILTRO ANTI-FALSO-POSITIVO (NÃO-TECH / SUPORTE / VENDAS / RH / ENGENHARIAS NÃO-SOFTWARE)
    const blacklistResult = matchesBlacklist(job.title);
    const nonTechPatterns = [
      /\b(sdr|bdr|inside sales|vendedor|vendedora|vendas|comercial|telemarketing|atendente|recepcionista)\b/i,
      /\b(recrutador|recrutadora|tech recruiter|talent acquisition|recursos humanos|analista de rh)\b/i,
      /\b(contador|contadora|contabilidade|fiscal|financeiro|secretariado|auxiliar administrativo)\b/i,
      /\b(motorista|balconista|estoquista|almoxarife|operador de caixa)\b/i,
      /\b(suporte n[ií]vel 1|helpdesk|help desk|sac)\b/i,
    ];

    const isNonTech = blacklistResult.matched || nonTechPatterns.some((pattern) => pattern.test(titleLower));

    // Validação tech mínima:
    // Deve ter match na whitelist de título OU possuir termos explícitos de desenvolvimento de software no título ou descrição
    const whitelistResult = matchesWhitelist(job.title);
    const hasExplicitDevTerm = /desenvolvedor|developer|engenheiro de software|programador|frontend|front-end|backend|back-end|full\s*stack|fullstack|devops|data engineer|analista de dados|analista de sistemas|software engineer/i.test(text);

    const isTechSoftware = !isNonTech && (whitelistResult.matched || hasExplicitDevTerm);

    // 2. DETECÇÃO DE SENIORIDADE
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

    // 3. CATEGORIZAÇÃO
    let category = 'Não-Tech';
    if (isTechSoftware) {
      if (/esp32|esp8266|arduino|raspberry|iot|mqtt|home assistant|embarcados|automa[cç][aã]o/i.test(text)) {
        category = 'IoT & Embarcados';
      } else if (/react native|flutter|mobile|android|ios|swift|kotlin/i.test(text)) {
        category = 'Mobile';
      } else if (/devops|sre|cloud|kubernetes|docker|terraform|infraestrutura|sysadmin/i.test(text)) {
        category = 'DevOps';
      } else if (/dados|data engineer|data science|analytics|bi|machine learning|ia\b/i.test(text)) {
        category = 'Data';
      } else if (/qa|qualidade de software|testes|tester|cypress|selenium/i.test(text)) {
        category = 'QA';
      } else if (/security|seguran[cç]a|cybersec|pentest/i.test(text)) {
        category = 'Security';
      } else if (/product manager|product owner|ui\/ux|ux designer|ui designer/i.test(text)) {
        category = 'Product & UI/UX';
      } else if (/frontend|front-end|front end/i.test(text) && !/backend|back-end/i.test(text)) {
        category = 'Frontend';
      } else if (/backend|back-end|back end/i.test(text) && !/frontend|front-end/i.test(text)) {
        category = 'Backend';
      } else if (/full\s*stack|fullstack|full-stack/i.test(text) || (/frontend|front-end/i.test(text) && /backend|back-end/i.test(text))) {
        // Apenas vagas que expressamente mencionam full stack ou ambas as pontas
        category = 'Full Stack';
      } else {
        // JAMAIS atribuir Full Stack por default!
        category = 'Software Geral';
      }
    }

    // 4. EXTRAÇÃO DE STACKS TÉCNICAS
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

    // 5. MODELO DE TRABALHO
    let workModel = 'Presencial';
    if (/remoto|remote|home office|teletrabalho|anywhere/i.test(text) || /remoto|home office/i.test(job.location || '')) {
      workModel = 'Remoto';
    } else if (/h[ií]brido|hybrid/i.test(text) || /h[ií]brido/i.test(job.location || '')) {
      workModel = 'Híbrido';
    }

    // 6. EXTRAÇÃO DE SALÁRIO & CONTATO DIRETO
    const salary = parseSalary(job.description ? job.description.match(/(?:r\$|sal[áa]rio:?)\s*[\d.,k\s-]+/i)?.[0] : null);
    const salaryStr = salary ? `R$ ${salary.min}${salary.max !== salary.min ? ` - R$ ${salary.max}` : ''}` : 'Não informado';

    const rawText = `${job.title} ${job.description}`;
    const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/gi);
    const directContact = emailMatch ? emailMatch[0] : undefined;

    const isJuniorFullStack = isTechSoftware && (requiredSeniority === 'Júnior' || requiredSeniority === 'Estágio' || requiredSeniority === 'Não especificado');
    const overallScore = isTechSoftware ? 85 : 0;

    let reasoning = '';
    if (!isTechSoftware) {
      reasoning = `Rejeitada via Heurística: Oportunidade não classificada como desenvolvimento ou tecnologia (${job.title}).`;
    } else {
      reasoning = `Aprovada via Heurística: Vaga técnica de ${category} (Nível: ${requiredSeniority}, Modelo: ${workModel}). ${techStack.length} tecnologias detectadas.`;
    }

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
