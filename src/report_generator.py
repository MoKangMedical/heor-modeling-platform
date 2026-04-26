"""报告生成模块 - HEOR Modeling Platform"""

import json
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ReportSection:
    """报告段落"""
    title: str = ""
    content: str = ""
    section_type: str = "text"  # text, table, chart, list
    data: Any = None
    order: int = 0


class ReportGenerator:
    """HEOR报告生成器"""

    def __init__(self):
        self.title: str = ""
        self.author: str = ""
        self.sections: List[ReportSection] = []
        self.metadata: Dict = {}

    def set_header(self, title: str, author: str = "",
                   date: str = "", **kwargs) -> None:
        self.title = title
        self.author = author
        self.metadata = {"date": date or datetime.now().strftime("%Y-%m-%d"), **kwargs}

    def add_section(self, title: str, content: str = "",
                    section_type: str = "text", data: Any = None,
                    order: int = 0) -> ReportSection:
        section = ReportSection(
            title=title, content=content,
            section_type=section_type, data=data, order=order
        )
        self.sections.append(section)
        self.sections.sort(key=lambda s: s.order)
        return section

    def add_executive_summary(self, key_findings: List[str],
                               recommendations: List[str] = None) -> None:
        """添加执行摘要"""
        content = "## 主要发现\n\n"
        for i, finding in enumerate(key_findings, 1):
            content += f"{i}. {finding}\n"
        if recommendations:
            content += "\n## 建议\n\n"
            for i, rec in enumerate(recommendations, 1):
                content += f"{i}. {rec}\n"
        self.add_section("执行摘要", content, "text", order=0)

    def add_model_overview(self, model_type: str, perspective: str,
                            horizon: int, discount_rate: float,
                            population: str = "") -> None:
        """添加模型概述"""
        content = f"""**模型类型:** {model_type}
**分析视角:** {perspective}
**时间范围:** {horizon}年
**贴现率:** {discount_rate * 100}%
**目标人群:** {population}
"""
        self.add_section("模型概述", content, "text", order=1)

    def add_icer_table(self, icer_data: List[Dict]) -> None:
        """添加ICER表"""
        self.add_section("增量成本效果分析", "", "table", data=icer_data, order=5)

    def add_sensitivity_results(self, tornado_data: List[Dict],
                                 psa_data: Dict = None) -> None:
        """添加敏感性分析"""
        content = "### 龙卷风图分析\n\n"
        for item in tornado_data[:5]:
            content += f"- **{item.get('parameter', '')}**: 范围 {item.get('range', 0):.2f}\n"
        if psa_data:
            content += f"\n### 概率敏感性分析\n\n"
            content += f"- 均值: {psa_data.get('mean', 0):.2f}\n"
            content += f"- 95% CI: [{psa_data.get('ci_2.5', 0):.2f}, {psa_data.get('ci_97.5', 0):.2f}]\n"
        self.add_section("敏感性分析", content, "text", order=7)

    def add_budget_impact(self, budget_data: List[Dict]) -> None:
        """添加预算影响"""
        content = ""
        for item in budget_data:
            content += f"- **第{item.get('year', 0)}年**: 增量成本 {item.get('incremental_cost', 0):,.0f} 元\n"
        self.add_section("预算影响分析", content, "table", data=budget_data, order=8)

    def add_conclusions(self, conclusions: List[str]) -> None:
        content = ""
        for i, c in enumerate(conclusions, 1):
            content += f"{i}. {c}\n"
        self.add_section("结论", content, "text", order=10)

    def add_references(self, references: List[str]) -> None:
        content = ""
        for i, ref in enumerate(references, 1):
            content += f"[{i}] {ref}\n"
        self.add_section("参考文献", content, "text", order=11)

    def generate_markdown(self) -> str:
        """生成Markdown报告"""
        lines = [
            f"# {self.title}\n",
            f"**作者:** {self.author}  ",
            f"**日期:** {self.metadata.get('date', '')}\n",
            "---\n"
        ]
        for section in self.sections:
            lines.append(f"## {section.title}\n")
            if section.section_type == "table" and section.data:
                if section.data and isinstance(section.data[0], dict):
                    headers = list(section.data[0].keys())
                    lines.append("| " + " | ".join(headers) + " |")
                    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
                    for row in section.data:
                        lines.append("| " + " | ".join(str(row.get(h, "")) for h in headers) + " |")
                    lines.append("")
            elif section.content:
                lines.append(section.content)
            lines.append("")
        return "\n".join(lines)

    def generate_json(self) -> str:
        """生成JSON报告"""
        report = {
            "title": self.title,
            "author": self.author,
            "metadata": self.metadata,
            "sections": [{
                "title": s.title, "content": s.content,
                "type": s.section_type, "data": s.data
            } for s in self.sections],
            "generated_at": datetime.now().isoformat()
        }
        return json.dumps(report, indent=2, ensure_ascii=False)

    def generate_html(self) -> str:
        """生成HTML报告"""
        md = self.generate_markdown()
        return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{self.title}</title>
<style>body{{font-family:Arial;max-width:800px;margin:auto;padding:20px;}}
table{{border-collapse:collapse;width:100%;}}th,td{{border:1px solid #ddd;padding:8px;text-align:left;}}
th{{background:#f5f5f5;}}h1{{color:#2c3e50;}}</style></head>
<body><pre style="white-space:pre-wrap;">{md}</pre></body></html>"""

    def get_statistics(self) -> Dict:
        return {
            "title": self.title,
            "total_sections": len(self.sections),
            "section_types": {s.section_type: sum(1 for ss in self.sections if ss.section_type == s.section_type)
                              for s in self.sections}
        }
