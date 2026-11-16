import logging
import re
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
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

async def scrape_glassdoor(
    query: Optional[str] = "desenvolvedor",
    location: Optional[str] = None,
    limit: int = 20,
    options: Optional[Dict[str, Any]] = None,
) -> List[JobResponseItem]:
    """
    Scraper resiliente para a plataforma Glassdoor com evasão stealth e tratamento tolerante de WAF.
    """
    raw_query = (query or "desenvolvedor").strip().lower()
    clean_query = re.sub(r'[^a-zA-Z0-9]+', '-', raw_query)
    
    url = f"https://www.glassdoor.com.br/Vaga/brasil-{clean_query}-vagas-SRCH_IL.0,6_IN36_KO7,{7 + len(clean_query)}.htm"
    jobs: List[JobResponseItem] = []
    seen_urls = set()

    # Tentativa via curl_cffi stealth session com impersonate chrome124
    if curl_requests:
        try:
            session = curl_requests.Session(impersonate="chrome124")
            session.headers.update(HEADERS)
            resp = session.get(url, timeout=15)

            # Fallback se url especifica não abrir
            if resp.status_code != 200:
                alt_url = "https://www.glassdoor.com.br/Vaga/brasil-desenvolvedor-vagas-SRCH_IL.0,6_IN36_KO7,20.htm"
                resp = session.get(alt_url, timeout=15)

            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.select('li[data-test="jobListing"], [class*="JobCard"]')
                
                for card in cards:
                    if len(jobs) >= limit:
                        break

                    title_el = card.select_one('[data-test="job-title"], a[data-test="job-link"], h2, h3')
                    company_el = card.select_one('[data-test="employer-name"], [class*="EmployerProfile"], [class*="employerName"]')
                    loc_el = card.select_one('[data-test="emp-location"], [class*="location"]')
                    link_el = card.select_one('a[data-test="job-link"], a[href*="/job-listing/"], a[href*="/partner/jobListing"]')

                    title = title_el.get_text(strip=True) if title_el else ""
                    company = company_el.get_text(strip=True) if company_el else "Glassdoor Employer"
                    loc = loc_el.get_text(strip=True) if loc_el else (location or "Brasil")
                    href = link_el.get("href", "") if link_el else ""

                    if not title or not href:
                        continue

                    full_url = href if href.startswith("http") else f"https://www.glassdoor.com.br{href}"
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    jobs.append(
                        JobResponseItem(
                            id=f"glassdoor-{len(jobs)+1}",
                            title=title,
                            company=company,
                            location=loc,
                            url=full_url,
                            source="glassdoor",
                            description=f"{title} na empresa {company} ({loc}) via Glassdoor",
                            publishedAt=datetime.now(timezone.utc).isoformat(),
                            workModel="Remoto" if "remoto" in (title + loc).lower() else "Presencial"
                        )
                    )
        except Exception as e:
            logger.debug(f"[Glassdoor] Sessão direta encontrou desafio: {e}")

    logger.info(f"[Glassdoor] Finalizado com {len(jobs)} vagas capturadas.")
    return jobs
