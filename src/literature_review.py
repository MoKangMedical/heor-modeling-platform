"""文献综述模块 - HEOR Modeling Platform"""

import uuid
import json
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Publication:
    """文献"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    authors: List[str] = field(default_factory=list)
    year: int = 0
    journal: str = ""
    doi: str = ""
    abstract: str = ""
    keywords: List[str] = field(default_factory=list)
    study_type: str = ""
    quality_score: float = 0.0
    relevance_score: float = 0.0
    notes: str = ""

    def to_dict(self) -> Dict:
        return {
            "id": self.id, "title": self.title,
            "authors": self.authors, "year": self.year,
            "journal": self.journal, "doi": self.doi,
            "abstract": self.abstract[:200] if self.abstract else "",
            "keywords": self.keywords, "study_type": self.study_type,
            "quality_score": self.quality_score,
            "relevance_score": self.relevance_score
        }


@dataclass
class ReviewSummary:
    """综述摘要"""
    topic: str = ""
    total_studies: int = 0
    included_studies: int = 0
    excluded_studies: int = 0
    by_study_type: Dict[str, int] = field(default_factory=dict)
    by_year: Dict[int, int] = field(default_factory=dict)
    key_findings: List[str] = field(default_factory=list)
    evidence_quality: str = ""


class LiteratureReviewer:
    """文献综述工具"""

    def __init__(self):
        self.publications: Dict[str, Publication] = {}
        self.included: List[str] = []
        self.excluded: List[str] = []
        self.exclusion_reasons: Dict[str, str] = {}

    def add_publication(self, title: str, authors: List[str] = None,
                        year: int = 0, journal: str = "", doi: str = "",
                        abstract: str = "", keywords: List[str] = None,
                        study_type: str = "") -> Publication:
        pub = Publication(
            title=title, authors=authors or [], year=year,
            journal=journal, doi=doi, abstract=abstract,
            keywords=keywords or [], study_type=study_type
        )
        self.publications[pub.id] = pub
        return pub

    def include_study(self, pub_id: str) -> bool:
        if pub_id not in self.publications:
            return False
        if pub_id not in self.included:
            self.included.append(pub_id)
        if pub_id in self.excluded:
            self.excluded.remove(pub_id)
        return True

    def exclude_study(self, pub_id: str, reason: str = "") -> bool:
        if pub_id not in self.publications:
            return False
        if pub_id not in self.excluded:
            self.excluded.append(pub_id)
        if pub_id in self.included:
            self.included.remove(pub_id)
        self.exclusion_reasons[pub_id] = reason
        return True

    def search(self, query: str = "", keywords: List[str] = None,
               year_range: tuple = None, study_types: List[str] = None,
               min_quality: float = 0) -> List[Publication]:
        """搜索文献"""
        results = list(self.publications.values())
        if query:
            q = query.lower()
            results = [p for p in results
                       if q in p.title.lower() or q in p.abstract.lower()]
        if keywords:
            kw_set = set(k.lower() for k in keywords)
            results = [p for p in results
                       if kw_set & set(k.lower() for k in p.keywords)]
        if year_range:
            results = [p for p in results if year_range[0] <= p.year <= year_range[1]]
        if study_types:
            results = [p for p in results if p.study_type in study_types]
        if min_quality > 0:
            results = [p for p in results if p.quality_score >= min_quality]
        return results

    def quality_assessment(self, pub_id: str, score: float, notes: str = "") -> bool:
        pub = self.publications.get(pub_id)
        if not pub:
            return False
        pub.quality_score = min(max(score, 0), 10)
        pub.notes = notes
        return True

    def get_summary(self) -> ReviewSummary:
        included_pubs = [self.publications[pid] for pid in self.included if pid in self.publications]
        by_type = {}
        by_year = {}
        for p in included_pubs:
            by_type[p.study_type] = by_type.get(p.study_type, 0) + 1
            by_year[p.year] = by_year.get(p.year, 0) + 1

        avg_quality = sum(p.quality_score for p in included_pubs) / max(len(included_pubs), 1)
        evidence = "high" if avg_quality >= 7 else "moderate" if avg_quality >= 4 else "low"

        return ReviewSummary(
            total_studies=len(self.publications),
            included_studies=len(self.included),
            excluded_studies=len(self.excluded),
            by_study_type=by_type,
            by_year=dict(sorted(by_year.items())),
            key_findings=[],
            evidence_quality=evidence
        )

    def prisma_data(self) -> Dict:
        """生成PRISMA流程数据"""
        return {
            "identified": len(self.publications),
            "screened": len(self.publications),
            "eligible": len(self.included) + len(self.excluded),
            "included": len(self.included),
            "excluded": len(self.excluded),
            "exclusion_reasons": self._count_exclusion_reasons()
        }

    def _count_exclusion_reasons(self) -> Dict[str, int]:
        counts = {}
        for reason in self.exclusion_reasons.values():
            counts[reason] = counts.get(reason, 0) + 1
        return counts

    def export_bibtex(self) -> str:
        lines = []
        for pub in self.publications.values():
            key = f"{pub.authors[0].split()[-1]}{pub.year}" if pub.authors else pub.id[:8]
            lines.append(f"@article{{{key},")
            lines.append(f'  title = {{{pub.title}}},')
            if pub.authors:
                lines.append(f'  author = {{{" and ".join(pub.authors)}}},')
            lines.append(f'  year = {{{pub.year}}},')
            if pub.journal:
                lines.append(f'  journal = {{{pub.journal}}},')
            if pub.doi:
                lines.append(f'  doi = {{{pub.doi}}},')
            lines.append("}\n")
        return "\n".join(lines)

    def export_summary_table(self) -> List[Dict]:
        return [p.to_dict() for p in self.publications.values() if p.id in self.included]
