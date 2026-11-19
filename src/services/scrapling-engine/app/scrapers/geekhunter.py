import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup

from app.schemas import JobResponseItem

logger = logging.getLogger("scrapling-engine.geekhunter")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
}


def parse_geekhunter_date(text: str) -> str:
    """Converte strings relativas como 'Publicada há 19 minutos' ou 'Publicada há 2 dias' para ISO UTC."""
    now = datetime.now(timezone.utc)
    if not text:
        return now.isoformat()

    cleaned = text.lower().strip()
    if any(k in cleaned for k in ("agora", "minuto", "hora", "hoje")):
        min_match = re.search(r"(\d+)\s*minuto", cleaned)
        if min_match:
            return (now - timedelta(minutes=int(min_match.group(1)))).isoformat()
        hr_match = re.search(r"(\d+)\s*hora", cleaned)
        if hr_match:
            return (now - timedelta(hours=int(hr_match.group(1)))).isoformat()
        return now.isoformat()

    if "ontem" in cleaned:
        return (now - timedelta(days=1)).isoformat()

    days_match = re.search(r"(\d+)\s*dia", cleaned)
    if days_match:
        return (now - timedelta(days=int(days_match.group(1)))).isoformat()

    weeks_match = re.search(r"(\d+)\s*semana", cleaned)
    if weeks_match:
        return (now - timedelta(weeks=int(weeks_match.group(1)))).isoformat()

    months_match = re.search(r"(\d+)\s*m[eê]s", cleaned)
    if months_match:
        return (now - timedelta(days=int(months_match.group(1)) * 30)).isoformat()

    return now.isoformat()


def _extract_company_from_url(job_url: str) -> Optional[str]:
    match = re.search(r"/pt/([^/]+)/jobs/", job_url)
    if not match:
        return None
    slug = re.sub(r"-\d+$", "", match.group(1)).strip("-")
    if not slug:
        return None
    return slug.replace("-", " ").title()


async def scrape_geekhunter(
    query: Optional[str] = "desenvolvedor",
    location: Optional[str] = None,
    limit: int = 20,
    options: Optional[Dict[str, Any]] = None,
) -> List[JobResponseItem]:
    """
    Scraper resiliente para a plataforma GeekHunter com paginação real e extração de empresa, data e descrição.
    """
    raw_query = (query or "desenvolvedor").strip()
    urls = [
        "https://www.geekhunter.com/pt/vagas",
        "https://www.geekhunter.com/pt/vagas?page=2",
    ]

    jobs: List[JobResponseItem] = []
    seen_urls = set()

    async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
        for url in urls:
            if len(jobs) >= limit:
                break

            try:
                logger.info(f"[GeekHunter] Buscando vagas em: {url}")
                response = await client.get(url)
                if response.status_code != 200:
                    logger.warning(f"[GeekHunter] Status HTTP {response.status_code} para {url}")
                    continue

                soup = BeautifulSoup(response.text, "html.parser")
                cards = soup.select('article, .job-card, .vaga-card, [data-testid="job-card"], .job-item, [class*="JobCard"]')

                for card in cards:
                    if len(jobs) >= limit:
                        break

                    title_el = card.select_one('h3 a, h2 a, h2, h3, a[href*="/jobs/"], a[href*="/vagas/"], [class*="title"]')
                    if not title_el:
                        continue
                    title = re.sub(r"\s+", " ", title_el.get_text(" ", strip=True)).strip()
                    if not title or len(title) < 3:
                        continue

                    link_el = card.select_one('a[href*="/jobs/"], a[href*="/vagas/"], a[href^="http"]')
                    href = link_el.get("href", "") if link_el else ""
                    if href.startswith("http"):
                        full_url = href
                    elif href.startswith("/"):
                        full_url = f"https://www.geekhunter.com{href}"
                    else:
                        full_url = f"https://www.geekhunter.com/{href}" if href else url

                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    company_el = card.select_one('.company-name, .company, .empresa, [class*="company"]')
                    company = company_el.get_text(" ", strip=True) if company_el else ""
                    if not company:
                        company = _extract_company_from_url(full_url) or "GeekHunter"

                    parts = [re.sub(r"\s+", " ", t).strip() for t in card.stripped_strings if t.strip()]

                    pub_date_text = ""
                    work_model = "Presencial"
                    detected_loc = ""
                    resp_texts: List[str] = []
                    req_skills: List[str] = []

                    section = None
                    for part in parts:
                        p_lower = part.lower()
                        if part == title:
                            continue
                        if "publicada" in p_lower and not pub_date_text:
                            pub_date_text = part
                            continue
                        if p_lower == "tarefas e responsabilidades":
                            section = "resp"
                            continue
                        if p_lower == "requisitos":
                            section = "req"
                            continue

                        if section == "resp":
                            resp_texts.append(part)
                            continue
                        if section == "req":
                            if not re.match(r"^\+\d+$", part):
                                req_skills.append(part)
                            continue

                        if "remoto" in p_lower:
                            work_model = "Remoto"
                        elif "híbrido" in p_lower or "hibrido" in p_lower:
                            work_model = "Híbrido"
                        elif "presencial" in p_lower and work_model == "Presencial":
                            work_model = "Presencial"

                        if (", brasil" in p_lower or re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s.-]+,\s*[A-Z]{2}\b", part)) and not detected_loc:
                            detected_loc = part

                    if not detected_loc:
                        detected_loc = location or ("Remoto" if work_model == "Remoto" else "Brasil")

                    desc_chunks: List[str] = []
                    if resp_texts:
                        desc_chunks.append(" ".join(resp_texts))
                    if req_skills:
                        desc_chunks.append(f"Requisitos: {', '.join(req_skills)}")
                    description = " | ".join(desc_chunks) if desc_chunks else f"{title} na {company} via GeekHunter"

                    jobs.append(
                        JobResponseItem(
                            id=f"geekhunter-{len(jobs)+1}",
                            title=title,
                            company=company,
                            location=detected_loc,
                            url=full_url,
                            source="geekhunter",
                            description=description[:600],
                            publishedAt=parse_geekhunter_date(pub_date_text),
                            workModel=work_model,
                        )
                    )

            except Exception as e:
                logger.warning(f"[GeekHunter] Erro ao consultar {url}: {e}")

    logger.info(f"[GeekHunter] Coletadas {len(jobs)} vagas para query '{raw_query}'")
    return jobs
