import logging
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup

from app.schemas import JobResponseItem

logger = logging.getLogger("scrapling-engine.trabalha_brasil")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

LOC_SLASH_PATTERN = re.compile(r"^([A-Za-zÀ-ÖØ-öø-ÿ\s.-]+)\s*/\s*([A-Z]{2})$")
IGNORED_COMPANY_TOKENS = {"...", "ver mais", "candidatar-me", "candidatar", "presencial", "remoto", "híbrido", "hibrido"}


def _clean_vaga_prefix(title: str) -> str:
    return re.sub(r"^vaga\s+de\s+", "", title.strip(), flags=re.IGNORECASE).strip()


async def scrape_trabalha_brasil(
    query: Optional[str] = "desenvolvedor",
    location: Optional[str] = None,
    limit: int = 20,
    options: Optional[Dict[str, Any]] = None,
) -> List[JobResponseItem]:
    """
    Scraper resiliente para a rede Trabalha Brasil / BNE (Banco Nacional de Empregos).
    Nota: trabalhabrasil.com.br usa Cloudflare Turnstile na listagem; a rede compartilhada em bne.com.br expõe cards SSR estruturados.
    """
    raw_query = (query or "desenvolvedor").strip()
    slug_query = re.sub(r"[^a-zA-Z0-9]+", "-", raw_query.lower()).strip("-")

    candidate_urls = [
        f"https://www.bne.com.br/vagas-de-emprego/{slug_query}",
        "https://www.bne.com.br/vagas-de-emprego/desenvolvedor-full-stack",
        "https://www.bne.com.br/vagas-de-emprego/desenvolvedor-front-end",
        "https://www.bne.com.br/vagas-de-emprego/desenvolvedor-back-end",
        "https://www.bne.com.br/vagas-de-emprego/programador",
    ]
    urls = list(dict.fromkeys(candidate_urls))

    jobs: List[JobResponseItem] = []
    seen_urls = set()

    async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
        for url in urls:
            if len(jobs) >= limit:
                break

            try:
                logger.info(f"[TrabalhaBrasil] Buscando em: {url}")
                response = await client.get(url)
                if response.status_code != 200:
                    logger.warning(f"[TrabalhaBrasil] Status HTTP {response.status_code} para {url}")
                    continue

                soup = BeautifulSoup(response.text, "html.parser")

                # 1. Parsing estruturado dos cards BNE / Trabalha Brasil
                cards = soup.select("section.job__card__container, div.card--list--vagas")
                for card in cards:
                    if len(jobs) >= limit:
                        break

                    link_el = card.select_one("a.card__link, h2 a, h3 a, a[href*='/vaga-de-emprego']")
                    if not link_el:
                        continue
                    href = link_el.get("href", "")
                    if not href or any(s in href for s in ("whatsapp", "facebook", "twitter", "linkedin")):
                        continue

                    full_url = href if href.startswith("http") else f"https://www.bne.com.br{href}"
                    if full_url in seen_urls:
                        continue

                    raw_title = re.sub(r"\s+", " ", link_el.get_text(" ", strip=True)).strip()
                    title = _clean_vaga_prefix(raw_title)
                    if not title or len(title) < 3:
                        continue

                    seen_urls.add(full_url)

                    strings = [re.sub(r"\s+", " ", s).strip() for s in card.stripped_strings if s.strip()]
                    loc = location or "Brasil"
                    work_model = "Presencial"
                    description = ""
                    company = ""

                    comp_el = card.select_one(".job__card__company, .empresa, [class*='company']")
                    if comp_el:
                        company = comp_el.get_text(" ", strip=True)

                    for s in strings:
                        s_lower = s.lower()
                        if s == raw_title or s == title or s_lower in IGNORED_COMPANY_TOKENS:
                            continue
                        loc_match = LOC_SLASH_PATTERN.match(s)
                        if loc_match:
                            loc = f"{loc_match.group(1).strip()} - {loc_match.group(2)}"
                            continue
                        if "remoto" in s_lower and len(s) < 25:
                            work_model = "Remoto"
                            continue
                        if ("híbrido" in s_lower or "hibrido" in s_lower) and len(s) < 25:
                            work_model = "Híbrido"
                            continue
                        if "presencial" in s_lower and len(s) < 25:
                            work_model = "Presencial"
                            continue
                        if len(s) > 45 and not description:
                            description = s
                            continue
                        if not company and 2 < len(s) <= 60 and s_lower != "confidencial":
                            # Evita usar subtítulo duplicado de cargo como nome de empresa quando idêntico ao título
                            if s_lower != title.lower():
                                company = s

                    if not company:
                        company = "Trabalha Brasil / BNE"
                    if not description:
                        description = f"{title} em {loc} via Trabalha Brasil / BNE"

                    jobs.append(
                        JobResponseItem(
                            id=f"tb-{len(jobs)+1}",
                            title=title,
                            company=company,
                            location=loc,
                            url=full_url,
                            source="trabalha_brasil",
                            description=description[:500],
                            publishedAt=datetime.now(timezone.utc).isoformat(),
                            workModel=work_model,
                        )
                    )

                # 2. Fallback caso nenhum card estruturado seja encontrado
                if len(jobs) < limit and not cards:
                    vaga_links = [
                        a for a in soup.find_all("a")
                        if a.get("href") and ("/vaga-de-emprego-" in a.get("href") or "/vaga-" in a.get("href"))
                    ]
                    for a_tag in vaga_links:
                        if len(jobs) >= limit:
                            break
                        href = a_tag.get("href", "")
                        if not href or any(s in href for s in ("whatsapp", "facebook", "twitter", "linkedin")):
                            continue
                        full_url = href if href.startswith("http") else f"https://www.bne.com.br{href}"
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)

                        title_text = _clean_vaga_prefix(a_tag.get_text(" ", strip=True))
                        if not title_text or len(title_text) < 3:
                            slug_part = href.split("/")[-2] if "/" in href else href
                            title_text = _clean_vaga_prefix(slug_part.replace("-", " ").title())

                        loc_match = re.search(r"em-([a-zA-Z\-]+)-(pr|sc|sp|rj|mg|rs|ba|df|pe|ce|go|es|pa|am|mt|ms)", href, re.IGNORECASE)
                        if loc_match:
                            city_clean = loc_match.group(1).replace("-", " ").title()
                            uf_clean = loc_match.group(2).upper()
                            loc = f"{city_clean} - {uf_clean}"
                        else:
                            loc = location or "Brasil"

                        is_remote = "remoto" in f"{title_text} {loc}".lower()
                        jobs.append(
                            JobResponseItem(
                                id=f"tb-{len(jobs)+1}",
                                title=title_text,
                                company="Trabalha Brasil / BNE",
                                location=loc,
                                url=full_url,
                                source="trabalha_brasil",
                                description=f"{title_text} em {loc} via Trabalha Brasil / BNE",
                                publishedAt=datetime.now(timezone.utc).isoformat(),
                                workModel="Remoto" if is_remote else "Presencial",
                            )
                        )

            except Exception as err:
                logger.warning(f"[TrabalhaBrasil] Erro na requisição para {url}: {err}")

    logger.info(f"[TrabalhaBrasil] Coletadas {len(jobs)} vagas para query '{raw_query}'")
    return jobs
