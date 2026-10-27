import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("scrapling-engine.cv_analyzer")

# Lista base de tecnologias conhecidas para extração heurística e enriquecimento
# Nota: 'C' foi removido da lista base para evitar falsos-positivos de marcadores (ex: c), c/) ou hífens.
# A captura de 'C' é feita exclusivamente via regex de contexto estrito (REGEX_C_LANG).
TECH_KEYWORDS = [
    "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "NestJS", "Express",
    "Python", "FastAPI", "Django", "Flask", "PHP", "Laravel", "Golang", "Java", "Spring Boot",
    "C#", ".NET", "C++", "Rust", "Ruby", "Rails",
    "HTML", "HTML5", "CSS", "CSS3", "Tailwind CSS", "Bootstrap", "Sass", "Styled Components",
    "Vue.js", "Angular", "Svelte", "Redux", "Zustand", "GraphQL", "REST APIs", "gRPC", "WebSockets",
    "PostgreSQL", "MySQL", "MongoDB", "SQLite", "Redis", "Supabase", "Firebase", "Prisma", "TypeORM",
    "Docker", "Kubernetes", "AWS", "Google Cloud", "GCP", "Azure", "CI/CD", "GitHub Actions", "Git", "Linux",
    "Microserviços", "Clean Architecture", "TDD", "Jest", "Cypress", "Playwright",
    "IoT", "ESP32", "ESP8266", "Arduino", "Raspberry Pi", "MQTT", "Home Assistant", "Automação", "Robótica",
    "Machine Learning", "IA", "LLM", "Pandas", "NumPy", "Scikit-Learn", "PyTorch", "TensorFlow"
]

# Regex rigorosa para capturar a linguagem C apenas em contextos inequívocos de programação
REGEX_C_LANG = r"\b(linguagem c|ansi c|c/c\+\+|c \/ c\+\+|c e c\+\+|c\+\+/c|desenvolvedor c|programação em c)\b"

SOFT_SKILLS_KEYWORDS = [
    "Comunicação assertiva", "Trabalho em equipe", "Resolução de problemas", "Pensamento crítico",
    "Autonomia", "Gestão de tempo", "Adaptabilidade", "Proatividade", "Liderança", "Metodologias Ágeis (Scrum/Kanban)"
]


def sanitize_analysis_output(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Higieniza o objeto JSON retornado pela IA ou heurística:
    - Remove falsos-positivos de letras únicas soltas (ex: 'c', 'a', 'b', 'e').
    - Garante que primary_stack e secondary_stack contenham apenas itens válidos presentes em hard_skills.
    - Remove duplicatas mantendo a caixa original.
    """
    if not isinstance(data, dict):
        return data

    raw_hard = data.get("hard_skills") or []
    cleaned_hard: List[str] = []

    # Proíbe letras isoladas únicas de 1 caractere, exceto tecnologias de 1 letra conhecidas como 'R' (com boundary)
    # 'C' só é mantida se explicitamente limpa e em maiúscula proveniente de contexto real C
    for skill in raw_hard:
        if not isinstance(skill, str):
            continue
        trimmed = skill.strip()
        if not trimmed:
            continue
        # Se for letra única solta minúscula ou marcador ruído, ignora (preserva 'C' maiúsculo para a linguagem C)
        if len(trimmed) == 1 and trimmed != "C" and trimmed.lower() in ['c', 'a', 'b', 'd', 'e', 'f', 'g', 'i', 'o', 'u', 'x', 'y', 'z']:
            continue
        if trimmed not in cleaned_hard:
            cleaned_hard.append(trimmed)

    raw_primary = data.get("primary_stack") or []
    cleaned_primary: List[str] = []
    for skill in raw_primary:
        if isinstance(skill, str):
            trimmed = skill.strip()
            if len(trimmed) == 1 and trimmed != "C" and trimmed.lower() in ['c', 'a', 'b', 'd', 'e', 'f', 'g', 'i', 'o', 'u', 'x', 'y', 'z']:
                continue
            if trimmed and trimmed not in cleaned_primary:
                cleaned_primary.append(trimmed)

    raw_secondary = data.get("secondary_stack") or []
    cleaned_secondary: List[str] = []
    for skill in raw_secondary:
        if isinstance(skill, str):
            trimmed = skill.strip()
            if len(trimmed) == 1 and trimmed != "C" and trimmed.lower() in ['c', 'a', 'b', 'd', 'e', 'f', 'g', 'i', 'o', 'u', 'x', 'y', 'z']:
                continue
            if trimmed and trimmed not in cleaned_secondary:
                cleaned_secondary.append(trimmed)

    # Garante que primary_stack e secondary_stack estejam refletidos em hard_skills
    for skill in cleaned_primary + cleaned_secondary:
        if skill not in cleaned_hard:
            cleaned_hard.append(skill)

    data["hard_skills"] = cleaned_hard
    data["primary_stack"] = cleaned_primary[:5]
    data["secondary_stack"] = [s for s in cleaned_secondary if s not in cleaned_primary]

    return data


def heuristic_cv_analysis(cv_text: str) -> Dict[str, Any]:
    """
    Análise heurística semântica baseada em regras para extração de dados do currículo.
    Executada com alta velocidade e utilizada também como fallback resiliente.
    """
    lower_text = cv_text.lower()

    # 1. Identificar Hard Skills presentes no texto
    detected_hard_skills: List[str] = []
    for tech in TECH_KEYWORDS:
        # Regex com limite de palavra
        pattern = r"(?<!\w)" + re.escape(tech.lower()) + r"(?!\w)"
        if re.search(pattern, lower_text):
            detected_hard_skills.append(tech)

    # Captura contextual estrita da linguagem C
    if re.search(REGEX_C_LANG, lower_text):
        if "C" not in detected_hard_skills:
            detected_hard_skills.append("C")

    # 2. Identificar Soft Skills
    detected_soft_skills: List[str] = []
    for soft in SOFT_SKILLS_KEYWORDS:
        if soft.lower() in lower_text or any(w.lower() in lower_text for w in soft.split()):
            if soft not in detected_soft_skills:
                detected_soft_skills.append(soft)

    if not detected_soft_skills:
        detected_soft_skills = ["Trabalho em equipe", "Resolução de problemas", "Proatividade", "Autonomia"]

    # 3. Estimar Senioridade
    # Prioridade 1: Declaração explícita no cabeçalho ou título profissional (primeiros 500 caracteres)
    header_text = lower_text[:500]
    seniority = "Júnior"

    if re.search(r"\b(j[úu]nior|jr\.?|iniciante|entry[- ]level)\b", header_text):
        seniority = "Júnior"
    elif re.search(r"\b(estagi[áa]rio|est[áa]gio|trainee)\b", header_text):
        seniority = "Estágio"
    elif re.search(r"\b(pleno|pl\.?|mid[- ]level)\b", header_text):
        seniority = "Pleno"
    elif re.search(r"\b(s[êe]nior|sr\.?|senior)\b", header_text):
        seniority = "Sênior"
    elif re.search(r"\b(tech lead|l[íi]der t[ée]cnico|principal engineer|staff engineer|arquiteto de software)\b", header_text):
        seniority = "Especialista / Tech Lead"
    else:
        # Prioridade 2: Análise contextual no corpo do currículo
        if re.search(r"\b(estagi[áa]rio|est[áa]gio|trainee)\b", lower_text):
            seniority = "Estágio"
        elif re.search(r"\b(tech lead|l[íi]der t[ée]cnico|principal engineer|staff engineer|arquiteto de software)\b", lower_text):
            seniority = "Especialista / Tech Lead"
        elif re.search(r"\b(s[êe]nior|sr\.?|senior|\b5\+?\s*anos|\b6\+?\s*anos|\b7\+?\s*anos|\b8\+?\s*anos)\b", lower_text):
            seniority = "Sênior"
        elif re.search(r"\b(pleno|pl\.?|mid[- ]level|\b3\s*anos|\b4\s*anos)\b", lower_text):
            seniority = "Pleno"
        elif re.search(r"\b(j[úu]nior|jr\.?|junior|\b1\s*ano|\b2\s*anos)\b", lower_text):
            seniority = "Júnior"

    # 4. Estimar Cargo Principal
    detected_role = "Desenvolvedor de Software"
    if re.search(r"(full\s*stack|fullstack)", lower_text):
        detected_role = "Desenvolvedor Full Stack"
    elif re.search(r"(frontend|front-end|front end)", lower_text):
        detected_role = "Desenvolvedor Frontend"
    elif re.search(r"(backend|back-end|back end)", lower_text):
        detected_role = "Desenvolvedor Backend"
    elif re.search(r"(iot|hardware|embarcados|automa[çc][ãa]o)", lower_text):
        detected_role = "Desenvolvedor IoT & Automação"
    elif re.search(r"(mobile|android|ios|react native|flutter)", lower_text):
        detected_role = "Desenvolvedor Mobile"
    elif re.search(r"(dados|data engineer|data scientist|machine learning)", lower_text):
        detected_role = "Engenheiro de Dados & IA"

    # 5. Gerar Resumo Executivo
    tech_highlight = ", ".join(detected_hard_skills[:6]) if detected_hard_skills else "tecnologias modernas"
    summary = (
        f"Profissional com foco em {detected_role} ({seniority}), com competências consolidadas em {tech_highlight}. "
        f"Perfil voltado para desenvolvimento ágil, entrega de código limpo e resolução de problemas técnicos complexos."
    )

    # 6. Pontos Fortes
    strengths = []
    if len(detected_hard_skills) >= 5:
        strengths.append(f"Stack técnica diversificada com {len(detected_hard_skills)} ferramentas e linguagens identificadas.")
    if "TypeScript" in detected_hard_skills or "React" in detected_hard_skills or "Next.js" in detected_hard_skills:
        strengths.append("Domínio em ecossistemas modernos de alta demanda no mercado (React, TypeScript e Next.js).")
    if "ESP32" in detected_hard_skills or "Arduino" in detected_hard_skills or "IoT" in detected_hard_skills:
        strengths.append("Diferencial competitivo sólido em IoT, Hardware e automação de sistemas.")
    if "Docker" in detected_hard_skills or "PostgreSQL" in detected_hard_skills:
        strengths.append("Boas práticas de infraestrutura, bancos de dados relacionais e containerização.")
    if not strengths:
        strengths.append("Perfil focado em evolução contínua e adoção de novas tecnologias.")

    # 7. Dicas de Melhoria ATS (Applicant Tracking Systems)
    improvement_tips = [
        "Quantifique conquistas nos tópicos de experiência (ex: 'Redução de 30% no tempo de carregamento', 'Desenvolvimento de 10+ endpoints').",
        "Inclua links diretos e clicáveis para repositórios no GitHub e aplicações em produção no topo do currículo.",
        "Mantenha uma seção destacada de 'Habilidades Técnicas' organizada por categorias (Frontend, Backend, Bancos, Ferramentas) para facilitar a leitura por robôs ATS."
    ]

    res = {
        "detected_role": detected_role,
        "detected_seniority": seniority,
        "hard_skills": detected_hard_skills,
        "soft_skills": detected_soft_skills,
        "primary_stack": detected_hard_skills[:3] if detected_hard_skills else [],
        "secondary_stack": detected_hard_skills[3:] if len(detected_hard_skills) > 3 else [],
        "work_model": None,
        "expected_salary": None,
        "summary": summary,
        "strengths": strengths,
        "improvement_tips": improvement_tips,
        "source": "heuristic-engine",
    }
    return sanitize_analysis_output(res)


async def analyze_cv_with_gemini(cv_text: str, api_key: str) -> Optional[Dict[str, Any]]:
    """
    Envia o texto do currículo para o modelo Gemini via API REST assíncrona
    retornando JSON estritamente estruturado.
    """
    prompt = f"""
Você é um recrutador técnico sênior e especialista em análise de currículos de tecnologia e sistemas ATS.
Analise o currículo a seguir e forneça uma estruturação JSON rigorosa.

Currículo do Candidato:
\"\"\"
{cv_text[:8000]}
\"\"\"

Instruções Estritas de Validação e Anti-Falso-Positivo:
1. NÃO inclua a linguagem "C" na lista de hard_skills, primary_stack ou secondary_stack a menos que o currículo mencione EXPLICITAMENTE "Linguagem C", "ANSI C" ou "C/C++". Ignore marcadores de lista como "c)", abreviações como "c/" (com/como) ou qualquer letra solta.
2. Identifique com máxima fidelidade todas as tecnologias reais e explícitas (ex: Node.js, React, TypeScript, PHP, Python, Docker, etc.).
3. Retorne APENAS um objeto JSON válido no seguinte formato exato (sem markdown em volta do json):

Format:
{{
  "detected_role": "Cargo principal inferido (ex: Desenvolvedor Full Stack, Dev Frontend, Engenheiro de Software)",
  "detected_seniority": "Estágio" ou "Júnior" ou "Pleno" ou "Sênior" ou "Especialista / Tech Lead",
  "hard_skills": ["lista", "de", "todas", "hard", "skills", "tecnologias"],
  "soft_skills": ["lista", "de", "soft", "skills"],
  "primary_stack": ["lista", "das", "3 a 5", "principais", "tecnologias", "de domínio central"],
  "secondary_stack": ["lista", "de", "tecnologias", "secundárias", "ou", "conhecimentos complementares"],
  "work_model": "Remoto ou Híbrido ou Presencial. Se não especificado no currículo, retorne null",
  "expected_salary": "Valor da pretensão salarial extraída. Se não especificado, retorne null",
  "summary": "Resumo executivo conciso e profissional em 2 a 4 frases do perfil do candidato",
  "strengths": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
  "improvement_tips": ["Dica 1 para melhorar o currículo para vagas e ATS", "Dica 2", "Dica 3"]
}}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidate_content = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(candidate_content)
                parsed["source"] = "gemini-2.5-flash"
                return sanitize_analysis_output(parsed)
            else:
                # Tenta fallback para gemini-1.5-flash se 2.5 não responder
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                res_fallback = await client.post(fallback_url, json=payload)
                if res_fallback.status_code == 200:
                    data = res_fallback.json()
                    candidate_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(candidate_content)
                    parsed["source"] = "gemini-1.5-flash"
                    return sanitize_analysis_output(parsed)
                else:
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            logger.error(f"Erro ao chamar API do Gemini para análise de CV: {e}")
            return None


async def analyze_cv_document(cv_text: str) -> Dict[str, Any]:
    """
    Orquestrador principal de análise de currículo:
    Tenta executar via Gemini AI; caso indisponível ou falhe, executa o motor heurístico semântico.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("HERMES_API_KEY")

    if api_key and cv_text.strip():
        ai_result = await analyze_cv_with_gemini(cv_text, api_key)
        if ai_result:
            return ai_result

    # Fallback automático
    return heuristic_cv_analysis(cv_text)

