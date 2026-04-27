"""数据导入模块 - HEOR Modeling Platform"""

import csv
import json
import io
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ImportResult:
    """导入结果"""
    source: str = ""
    format: str = ""
    records_imported: int = 0
    records_failed: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    imported_at: str = field(default_factory=lambda: datetime.now().isoformat())


class DataImporter:
    """数据导入器"""

    def __init__(self):
        self.import_history: List[ImportResult] = []
        self._validators: Dict[str, callable] = {}

    def import_csv(self, content: str, delimiter: str = ",",
                   has_header: bool = True) -> ImportResult:
        """导入CSV数据"""
        result = ImportResult(format="csv")
        try:
            reader = csv.DictReader(io.StringIO(content), delimiter=delimiter) if has_header else csv.reader(io.StringIO(content), delimiter=delimiter)
            records = list(reader)
            result.records_imported = len(records)
        except Exception as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def import_json(self, content: str) -> ImportResult:
        """导入JSON数据"""
        result = ImportResult(format="json")
        try:
            data = json.loads(content)
            if isinstance(data, list):
                result.records_imported = len(data)
            elif isinstance(data, dict):
                result.records_imported = 1
        except json.JSONDecodeError as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def import_markov_data(self, content: str) -> ImportResult:
        """导入马尔可夫模型数据"""
        result = ImportResult(format="markov")
        try:
            data = json.loads(content)
            states = data.get("states", [])
            transitions = data.get("transitions", [])
            result.records_imported = len(states) + len(transitions)
            if not states:
                result.warnings.append("No states found")
        except Exception as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def import_clinical_trial(self, content: str) -> ImportResult:
        """导入临床试验数据"""
        result = ImportResult(format="clinical_trial")
        try:
            data = json.loads(content)
            arms = data.get("arms", [])
            endpoints = data.get("endpoints", [])
            result.records_imported = len(arms) + len(endpoints)
        except Exception as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def import_survival_data(self, content: str) -> ImportResult:
        """导入生存分析数据"""
        result = ImportResult(format="survival")
        try:
            data = json.loads(content)
            records = data.get("records", data if isinstance(data, list) else [])
            result.records_imported = len(records)
        except Exception as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def import_utility_data(self, content: str) -> ImportResult:
        """导入效用数据"""
        result = ImportResult(format="utility")
        try:
            data = json.loads(content)
            if isinstance(data, list):
                result.records_imported = len(data)
            elif isinstance(data, dict):
                result.records_imported = len(data.get("utilities", []))
        except Exception as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def import_cost_data(self, content: str) -> ImportResult:
        """导入成本数据"""
        result = ImportResult(format="cost")
        try:
            data = json.loads(content)
            if isinstance(data, list):
                result.records_imported = len(data)
            elif isinstance(data, dict):
                result.records_imported = len(data.get("costs", []))
        except Exception as e:
            result.errors.append(str(e))
        self.import_history.append(result)
        return result

    def add_validator(self, data_type: str, validator: callable) -> None:
        self._validators[data_type] = validator

    def validate_import(self, data: Any, data_type: str) -> List[str]:
        """验证导入数据"""
        validator = self._validators.get(data_type)
        if not validator:
            return []
        try:
            return validator(data)
        except Exception as e:
            return [str(e)]

    def get_import_history(self) -> List[Dict]:
        return [{
            "source": r.source, "format": r.format,
            "records_imported": r.records_imported,
            "records_failed": r.records_failed,
            "errors": len(r.errors),
            "warnings": len(r.warnings),
            "imported_at": r.imported_at
        } for r in self.import_history]

    def get_statistics(self) -> Dict:
        return {
            "total_imports": len(self.import_history),
            "total_records": sum(r.records_imported for r in self.import_history),
            "total_errors": sum(len(r.errors) for r in self.import_history),
            "by_format": self._count_by_format()
        }

    def _count_by_format(self) -> Dict[str, int]:
        counts = {}
        for r in self.import_history:
            counts[r.format] = counts.get(r.format, 0) + 1
        return counts

    @staticmethod
    def parse_csv_to_dicts(content: str, delimiter: str = ",") -> List[Dict]:
        """解析CSV为字典列表"""
        reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
        return list(reader)

    @staticmethod
    def parse_json_records(content: str) -> List[Dict]:
        """解析JSON记录"""
        data = json.loads(content)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            for key in ["records", "data", "items", "results"]:
                if key in data and isinstance(data[key], list):
                    return data[key]
            return [data]
        return []
