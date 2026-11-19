import asyncio
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from bs4 import BeautifulSoup
try:
    from curl_cffi import requests as curl_requests
except ImportError:
    curl_requests = None

from app.schemas import JobResponseItem

logger = logging.getLogger("scrapling-engine.glassdoor")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.google.com/",
}


def parse_glassdoor_age(age_str: str) -> str:
    """Converte indicadores como '24h', '1 d', '2 d', '30+ d', 'Hoje' para ISO UTC."""
    now = datetime.now(timezone.utc)
    if not age_str:
        return now.isoformat()

    cleaned = age_str.lower().strip()
    if any(k in cleaned for k in ("hoje", "agora", "today", "just")):
        return now.isoformat()
    if "ontem" in cleaned or "yesterday" in cleaned:
        return (now - timedelta(days=1)).isoformat()

    hr_match = re.search(r"(\d+)\s*h", cleaned)
    if hr_match:
        return (now - timedelta(hours=int(hr_match.group(1)))).isoformat()

    day_match = re.search(r"(\d+)\s*\+?\s*d", cleaned)
    if day_match:
        return (now - timedelta(days=int(day_match.group(1)))).isoformat()

    week_match = re.search(r"(\d+)\s*(?:sem|w)", cleaned)
    if week_match:
        return (now - timedelta(weeks=int(week_match.group(1)))).isoformat()

    return now.isoformat()


def _fetch_glassdoor_html(url: str, alt_url: str) -> Optional[str]:
    if not curl_requests:
        return None
    try:
        session = curl_requests.Session(impersonate="chrome124")
        session.headers.update(HEADERS)
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            logger.warning(f"[Glassdoor] Status HTTP {resp.status_code} para {url}")
            if url != alt_url:
                resp = session.get(alt_url, timeout=15)
        if resp.status_code == 200:
            return resp.text
        logger.warning(f"[Glassdoor] Acesso bloqueado ou indisponível (HTTP {resp.status_code}). Retornando lista vazia sem burlar proteção.")
    except Exception as e:
        logger.warning(f"[Glassdoor] Falha na requisição curl_cffi: {e}")
    return None


async def scrape_glassdoor(
    query: Optional[str] = "desenvolvedor",
    location: Optional[str] = None,
    limit: int = 20,
    options: Optional[Dict[str, Any]] = None,
) -> List[JobResponseItem]:
    """
    Scraper resiliente para a plataforma Glassdoor com limpeza de empresa, data de publicação e tratamento tolerante de WAF.
    """
    raw_query = (query or "desenvolvedor").strip().lower()
    clean_query = re.sub(r"[^a-zA-Z0-9]+", "-", raw_query).strip("-")

    url = f"https://www.glassdoor.com.br/Vaga/brasil-{clean_query}-vagas-SRCH_IL.0,6_IN36_KO7,{7 + len(clean_query)}.htm"
    alt_url = "https://www.glassdoor.com.br/Vaga/brasil-desenvolvedor-vagas-SRCH_IL.0,6_IN36_KO7,20.htm"
    jobs: List[JobResponseItem] = []
    seen_urls = set()

    try:
        html_text = await asyncio.to_thread(_fetch_glassdoor_html, url, alt_url)
        if html_text:
            soup = BeautifulSoup(html_text, "html.parser")
            cards = soup.select('li[data-test="jobListing"], [class*="JobCard"]')

            for card in cards:
                if len(jobs) >= limit:
                    break

                title_el = card.select_one('[data-test="job-title"], a[data-test="job-link"], h2, h3')
                company_el = card.select_one(
                    '[class*="EmployerProfile_compactEmployerName"], [data-test="employer-name"], [class*="EmployerProfile"], [class*="employerName"]'
                )
                loc_el = card.select_one('[data-test="emp-location"], [class*="location"]')
                link_el = card.select_one('a[data-test="job-link"], a[href*="/job-listing/"], a[href*="/partner/jobListing"]')
                age_el = card.select_one('[data-test="job-age"]')
                salary_el = card.select_one('[data-test="detailSalary"]')

                title = title_el.get_text(strip=True) if title_el else ""
                raw_company = company_el.get_text(" ", strip=True) if company_el else "Glassdoor Employer"
                company = re.sub(r"\s*\d+[.,]\d+\s*$", "", raw_company).strip() or "Glassdoor Employer"
                loc = loc_el.get_text(strip=True) if loc_el else (location or "Brasil")
                href = link_el.get("href", "") if link_el else ""
                age_text = age_el.get_text(strip=True) if age_el else ""
                salary_text = salary_el.get_text(" ", strip=True) if salary_el else None

                if not title or not href:
                    continue

                full_url = href if href.startswith("http") else f"https://www.glassdoor.com.br{href}"
                if full_url in seen_urls:
                    continue
                seen_urls.add(full_url)

                combined = f"{title} {loc}".lower()
                work_model = "Remoto" if ("remoto" in combined or "trabalho remoto" in combined) else ("Híbrido" if "híbrido" in combined or "hibrido" in combined else "Presencial")

                jobs.append(
                    JobResponseItem(
                        id=f"glassdoor-{len(jobs)+1}",
                        title=title,
                        company=company,
                        location=loc,
                        url=full_url,
                        source="glassdoor",
                        description=f"{title} na empresa {company} ({loc}) via Glassdoor",
                        publishedAt=parse_glassdoor_age(age_text),
                        salary=salary_text,
                        workModel=work_model,
                    )
                )
    except Exception as e:
        logger.debug(f"[Glassdoor] Sessão direta encontrou desafio: {e}")

    logger.info(f"[Glassdoor] Finalizado com {len(jobs)} vagas capturadas.")
    return jobs
