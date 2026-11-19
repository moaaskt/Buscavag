import json
import logging
import re
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup

from app.schemas import JobResponseItem

logger = logging.getLogger("scrapling-engine.catho")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def parse_catho_relative_date(date_str: str) -> str:
    """Converte strings de data relativa da Catho em ISO string UTC."""
    if not date_str:
        return datetime.now(timezone.utc).isoformat()

    cleaned = date_str.lower().strip()
    now = datetime.now(timezone.utc)

    if "hoje" in cleaned or "agora" in cleaned or "minuto" in cleaned or "hora" in cleaned:
        return now.isoformat()
    if "ontem" in cleaned:
        return (now - timedelta(days=1)).isoformat()

    # "há X dias", "publicada há X dias"
    days_match = re.search(r"h[aá]\s*(\d+)\s*dia", cleaned)
    if days_match:
        days = int(days_match.group(1))
        return (now - timedelta(days=days)).isoformat()

    # Formatos dd/mm ou dd/mm/aaaa
    date_match = re.search(r"(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?", cleaned)
    if date_match:
        try:
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            has_year = bool(date_match.group(3))
            year = int(date_match.group(3)) if has_year else now.year
            if year < 100:
                year += 2000
            parsed_dt = datetime(year, month, day, tzinfo=timezone.utc)
            if not has_year and parsed_dt > now + timedelta(days=2):
                parsed_dt = datetime(year - 1, month, day, tzinfo=timezone.utc)
            return parsed_dt.isoformat()
        except Exception:
            pass

    return now.isoformat()


async def scrape_catho(
    query: Optional[str] = "desenvolvedor",
    location: Optional[str] = None,
    limit: int = 20,
    options: Optional[Dict[str, Any]] = None,
) -> List[JobResponseItem]:
    """
    Scraper resiliente para a plataforma Catho.
    Tenta múltiplos caminhos:
    1. Parsing de __NEXT_DATA__ se disponível
    2. Parsing de JSON-LD Schema.org
    3. Parsing de seletores DOM otimizados (com paginação)
    """
    query_str = (query or "desenvolvedor").strip()
    encoded_query = urllib.parse.quote_plus(query_str)

    urls_to_try = [
        f"https://www.catho.com.br/vagas/?q={encoded_query}&page=1",
        f"https://www.catho.com.br/vagas/?q={encoded_query}&page=2",
    ]
    if "junior" in query_str.lower() or "jr" in query_str.lower():
        urls_to_try.append("https://www.catho.com.br/vagas/desenvolvedor-junior/")
        urls_to_try.append("https://www.catho.com.br/vagas/desenvolvedor-full-stack-junior/")

    jobs: List[JobResponseItem] = []
    seen_urls = set()

    async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
        for url in urls_to_try:
            if len(jobs) >= limit:
                break

            try:
                logger.info(f"[Catho] Buscando vagas em: {url}")
                response = await client.get(url)

                if response.status_code != 200:
                    logger.warning(f"[Catho] Resposta HTTP status {response.status_code} para {url}")
                    continue

                html = response.text
                soup = BeautifulSoup(html, "html.parser")

                # 1. Tentar extrair de __NEXT_DATA__
                next_data_script = soup.find("script", id="__NEXT_DATA__")
                if next_data_script and next_data_script.string:
                    try:
                        next_json = json.loads(next_data_script.string)
                        page_props = next_json.get("props", {}).get("pageProps", {})
                        raw_jobs_list = page_props.get("jobList") or page_props.get("jobs") or []

                        if isinstance(raw_jobs_list, dict):
                            raw_jobs_list = raw_jobs_list.get("items", []) or raw_jobs_list.get("data", [])

                        for item in raw_jobs_list:
                            if len(jobs) >= limit:
                                break
                            if not isinstance(item, dict):
                                continue

                            job_id = str(item.get("id") or item.get("jobId") or item.get("codigoVaga") or "")
                            title = item.get("title") or item.get("cargo") or item.get("jobTitle") or ""
                            company = item.get("company") or item.get("empresa") or item.get("companyName") or "Catho"
                            loc = item.get("location") or item.get("cidade") or item.get("city") or location or "Brasil"
                            job_slug = item.get("url") or item.get("jobUrl") or item.get("slug") or ""
                            salary = item.get("salary") or item.get("salario") or item.get("faixaSalarial") or ""
                            desc = item.get("description") or item.get("descricao") or item.get("resumo") or f"{title} na {company}"
                            date_raw = item.get("publishedAt") or item.get("dataPublicacao") or item.get("date") or ""

                            if not title:
                                continue

                            full_url = job_slug if job_slug.startswith("http") else f"https://www.catho.com.br{job_slug}"
                            if full_url in seen_urls:
                                continue
                            seen_urls.add(full_url)

                            jobs.append(
                                JobResponseItem(
                                    id=job_id or f"catho-{len(jobs)+1}",
                                    title=title.strip(),
                                    company=(company.strip() or "Catho"),
                                    location=(loc.strip() or location or "Brasil"),
                                    url=full_url,
                                    source="catho",
                                    description=desc.strip(),
                                    publishedAt=parse_catho_relative_date(str(date_raw)),
                                    salary=str(salary).strip() if salary else None,
                                    workModel="Híbrido" if "hibrido" in (title + desc).lower() else ("Remoto" if "remoto" in (title + desc).lower() else "Presencial"),
                                )
                            )
                    except Exception as err:
                        logger.debug(f"[Catho] Falha ao processar __NEXT_DATA__: {err}")

                # 2. Tentar extrair de JSON-LD
                for script in soup.find_all("script", type="application/ld+json"):
                    if len(jobs) >= limit:
                        break
                    if not script.string:
                        continue
                    try:
                        data = json.loads(script.string)
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if item.get("@type") == "JobPosting":
                                title = item.get("title", "")
                                company_info = item.get("hiringOrganization", {})
                                company = company_info.get("name", "Catho") if isinstance(company_info, dict) else str(company_info)
                                job_url = item.get("url") or url
                                if job_url in seen_urls:
                                    continue
                                seen_urls.add(job_url)

                                loc_info = item.get("jobLocation", {})
                                loc_addr = loc_info.get("address", {}) if isinstance(loc_info, dict) else {}
                                loc = loc_addr.get("addressLocality") if isinstance(loc_addr, dict) else "Brasil"
                                date_posted = item.get("datePosted") or datetime.now(timezone.utc).isoformat()
                                desc = item.get("description", "")

                                jobs.append(
                                    JobResponseItem(
                                        id=f"catho-ld-{len(jobs)+1}",
                                        title=title.strip(),
                                        company=(company.strip() or "Catho"),
                                        location=(loc or location or "Brasil"),
                                        url=job_url,
                                        source="catho",
                                        description=desc[:300].strip() if desc else f"{title} - {company}",
                                        publishedAt=date_posted,
                                        workModel="Remoto" if "telecommute" in str(item).lower() or "remoto" in title.lower() else None,
                                    )
                                )
                    except Exception:
                        pass

                # 3. Fallback: Parse dos Cards DOM (estrutura atual article.offer)
                if len(jobs) < limit:
                    cards = soup.select(
                        'article.offer, article[data-offer-item-subcontainer], article, [data-testid*="job"], [class*="job-card"]'
                    )
                    for card in cards:
                        if len(jobs) >= limit:
                            break

                        title_el = card.select_one(
                            'h2.title_offer a, h2 a, h3 a, a[href*="/vagas/"], h2, h3, [class*="title"], [data-testid*="title"]'
                        )
                        if not title_el:
                            continue

                        title = title_el.get_text(" ", strip=True)
                        if not title or len(title) < 3:
                            continue

                        link_el = title_el if title_el.name == "a" else card.select_one('h2.title_offer a, a[href*="/vagas/"], a[href*="catho.com.br"]')
                        href = link_el.get("href", "") if link_el else ""
                        full_url = href if href.startswith("http") else (f"https://www.catho.com.br{href}" if href else url)

                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)

                        company_el = card.select_one('p span.text-12, [class*="company"], [data-testid*="company"], [class*="empresa"], [class*="info-empresa"]')
                        company = re.sub(r"\s+", " ", company_el.get_text(" ", strip=True)) if company_el else "Catho"
                        if not company:
                            company = "Catho"

                        loc = ""
                        loc_icon = card.select_one("span.i_job_location")
                        if loc_icon and loc_icon.parent:
                            raw_loc = re.sub(r"\s+", " ", loc_icon.parent.get_text(" ", strip=True)).strip()
                            loc = re.sub(r"^\d+\s*vagas?\s*[-–]\s*", "", raw_loc, flags=re.IGNORECASE).strip()
                            loc = re.sub(r"^[-–]\s*", "", loc).strip()
                        if not loc:
                            loc_el = card.select_one('[class*="location"], [class*="local"], [data-testid*="location"], [class*="cidade"]')
                            loc = re.sub(r"\s+", " ", loc_el.get_text(" ", strip=True)).strip() if loc_el else ""
                        if not loc:
                            loc = location or "Brasil"

                        salary = None
                        salary_icon = card.select_one("span.i_salary")
                        if salary_icon and salary_icon.parent:
                            strong_el = salary_icon.parent.find("strong")
                            sal_text = strong_el.get_text(" ", strip=True) if strong_el else salary_icon.parent.get_text(" ", strip=True)
                            sal_text = re.sub(r"\s+", " ", sal_text).strip()
                            if sal_text:
                                salary = sal_text
                        if not salary:
                            salary_el = card.select_one('[class*="salary"], [class*="salario"], [data-testid*="salary"]')
                            if salary_el:
                                salary = salary_el.get_text(" ", strip=True) or None

                        date_el = card.select_one('span.tag, [class*="pub_"], [class*="date"], [class*="data"], time, [class*="published"]')
                        date_str = date_el.get_text(" ", strip=True) if date_el else ""
                        pub_date = parse_catho_relative_date(date_str)

                        desc_el = card.select_one('[class*="description"], [class*="descricao"], [class*="resumo"]')
                        desc = desc_el.get_text(" ", strip=True) if desc_el else f"{title} na empresa {company} - {loc} (Catho)"

                        combined = f"{title} {desc} {loc}".lower()
                        is_remote = "remoto" in combined or "home office" in combined
                        is_hybrid = "híbrido" in combined or "hibrido" in combined
                        work_model = "Remoto" if is_remote else ("Híbrido" if is_hybrid else "Presencial")

                        jobs.append(
                            JobResponseItem(
                                id=f"catho-dom-{len(jobs)+1}",
                                title=title,
                                company=company,
                                location=loc,
                                url=full_url,
                                source="catho",
                                description=desc,
                                publishedAt=pub_date,
                                salary=salary,
                                workModel=work_model,
                            )
                        )

            except Exception as e:
                logger.warning(f"[Catho] Erro na requisição para {url}: {e}")

    logger.info(f"[Catho] Coletadas {len(jobs)} vagas para a consulta '{query_str}'")
    return jobs
