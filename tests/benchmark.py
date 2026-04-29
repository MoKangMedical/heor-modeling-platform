"""
HEOR Modeling Platform 性能基准测试

测试核心建模引擎的计算性能和精度
"""

import time
import numpy as np
import sys
import os

# 添加src目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def benchmark_markov_model():
    """Markov模型性能测试"""
    print("=" * 60)
    print("Markov模型性能测试")
    print("=" * 60)
    
    try:
        from markov_model import MarkovModel
        
        # 测试不同规模的模型
        test_cases = [
            {"states": 3, "cycles": 30, "name": "小型模型 (3状态, 30周期)"},
            {"states": 5, "cycles": 60, "name": "中型模型 (5状态, 60周期)"},
            {"states": 8, "cycles": 120, "name": "大型模型 (8状态, 120周期)"},
            {"states": 10, "cycles": 240, "name": "超大模型 (10状态, 240周期)"},
        ]
        
        results = []
        for case in test_cases:
            states = [f"State_{i}" for i in range(case["states"])]
            
            model = MarkovModel(
                states=states,
                cycle_length=1,
                num_cycles=case["cycles"],
                discount_rate=0.03
            )
            
            # 设置随机转移概率
            rng = np.random.default_rng(42)
            for i, s1 in enumerate(states):
                for j, s2 in enumerate(states):
                    if i != j:
                        model.set_transition(s1, s2, base=rng.uniform(0.01, 0.1))
            
            # 运行并计时
            start = time.time()
            for _ in range(10):  # 运行10次取平均
                result = model.run()
            elapsed = (time.time() - start) / 10
            
            results.append({
                "name": case["name"],
                "time_ms": elapsed * 1000,
                "states": case["states"],
                "cycles": case["cycles"]
            })
            
            print(f"  {case['name']}: {elapsed*1000:.2f} ms")
        
        return results
    except ImportError as e:
        print(f"  跳过 (缺少依赖): {e}")
        return []


def benchmark_psa():
    """概率敏感性分析性能测试"""
    print("\n" + "=" * 60)
    print("概率敏感性分析 (PSA) 性能测试")
    print("=" * 60)
    
    try:
        from psa import ProbabilisticSensitivityAnalysis
        from cost_effectiveness import CostEffectivenessAnalysis
        from markov_model import MarkovModel
        
        # 创建基础模型
        model = MarkovModel(
            states=["健康", "疾病", "死亡"],
            cycle_length=1,
            num_cycles=30,
            discount_rate=0.03
        )
        
        cea = CostEffectivenessAnalysis(
            model=model,
            comparator="标准治疗",
            intervention="新药A"
        )
        
        # 测试不同PSA样本量
        sample_sizes = [100, 500, 1000, 5000, 10000]
        results = []
        
        for n in sample_sizes:
            psa = ProbabilisticSensitivityAnalysis(
                cea=cea,
                n_simulations=n,
                sampling_method="lhs"
            )
            
            start = time.time()
            psa_results = psa.run()
            elapsed = time.time() - start
            
            results.append({
                "samples": n,
                "time_ms": elapsed * 1000,
                "time_per_sample_us": elapsed / n * 1e6
            })
            
            print(f"  {n:>6} 样本: {elapsed*1000:>8.2f} ms ({elapsed/n*1e6:.2f} μs/样本)")
        
        return results
    except ImportError as e:
        print(f"  跳过 (缺少依赖): {e}")
        return []


def benchmark_survival_analysis():
    """生存分析性能测试"""
    print("\n" + "=" * 60)
    print("生存分析性能测试")
    print("=" * 60)
    
    try:
        from survival_analysis import SurvivalAnalysis
        
        # 测试不同样本量
        sample_sizes = [100, 500, 1000, 5000]
        results = []
        
        for n in sample_sizes:
            # 生成模拟生存数据
            rng = np.random.default_rng(42)
            times = rng.exponential(scale=12, size=n)
            events = rng.binomial(1, 0.7, size=n)
            
            sa = SurvivalAnalysis()
            
            start = time.time()
            # Kaplan-Meier估计
            km_result = sa.kaplan_meier(times, events)
            # 参数化拟合
            weibull_result = sa.fit_weibull(times, events)
            elapsed = time.time() - start
            
            results.append({
                "samples": n,
                "time_ms": elapsed * 1000
            })
            
            print(f"  {n:>5} 样本: {elapsed*1000:>8.2f} ms")
        
        return results
    except ImportError as e:
        print(f"  跳过 (缺少依赖): {e}")
        return []


def benchmark_cost_effectiveness():
    """成本效果分析性能测试"""
    print("\n" + "=" * 60)
    print("成本效果分析性能测试")
    print("=" * 60)
    
    try:
        from cost_effectiveness import CostEffectivenessAnalysis
        from markov_model import MarkovModel
        
        model = MarkovModel(
            states=["健康", "疾病", "死亡"],
            cycle_length=1,
            num_cycles=30,
            discount_rate=0.03
        )
        
        # 设置转移概率
        model.set_transition("健康", "疾病", base=0.05)
        model.set_transition("健康", "死亡", base=0.01)
        model.set_transition("疾病", "死亡", base=0.08)
        
        cea = CostEffectivenessAnalysis(
            model=model,
            comparator="标准治疗",
            intervention="新药A"
        )
        
        # 运行多次
        n_runs = 100
        start = time.time()
        for _ in range(n_runs):
            results = cea.run()
        elapsed = (time.time() - start) / n_runs
        
        print(f"  单次CEA分析: {elapsed*1000:.2f} ms")
        print(f"  ICER: ¥{results.get('icer', 'N/A'):,.0f}/QALY")
        
        return {"time_ms": elapsed * 1000, "runs": n_runs}
    except ImportError as e:
        print(f"  跳过 (缺少依赖): {e}")
        return {}


def run_all_benchmarks():
    """运行所有基准测试"""
    print("\n" + "HEOR Modeling Platform 性能基准测试")
    print("=" * 60)
    print(f"Python版本: {sys.version}")
    print(f"NumPy版本: {np.__version__}")
    print("=" * 60)
    
    all_results = {}
    
    all_results["markov"] = benchmark_markov_model()
    all_results["psa"] = benchmark_psa()
    all_results["survival"] = benchmark_survival_analysis()
    all_results["cea"] = benchmark_cost_effectiveness()
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    if all_results["markov"]:
        print(f"Markov模型: {all_results['markov'][0]['time_ms']:.2f} ms (最小)")
    if all_results["psa"]:
        print(f"PSA(1000样本): {[r for r in all_results['psa'] if r['samples']==1000][0]['time_ms']:.2f} ms")
    if all_results["survival"]:
        print(f"生存分析(1000样本): {[r for r in all_results['survival'] if r['samples']==1000][0]['time_ms']:.2f} ms")
    if all_results["cea"]:
        print(f"CEA分析: {all_results['cea']['time_ms']:.2f} ms")
    
    print("\n基准测试完成!")
    return all_results


if __name__ == "__main__":
    results = run_all_benchmarks()
