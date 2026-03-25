# API Contract Draft

## Principles

- Every analysis request is bound to an immutable `model_version_id`.
- Every run persists an `input_snapshot_json`.
- Simulation and calibration are asynchronous workflows represented as `runs`.
- Evidence objects are first-class API resources.

## Resource Groups

### Health

- `GET /health`

### Evidence

- `POST /api/v1/projects/{project_id}/clinical-series`
- `GET /api/v1/clinical-series/{series_id}`
- `POST /api/v1/projects/{project_id}/compound-curves`
- `GET /api/v1/compound-curves/{curve_id}`

### Probability Functions

- `POST /api/v1/model-versions/{model_version_id}/probability-functions`
- `POST /api/v1/probability-functions/{function_id}/debug`

### Runs

- `POST /api/v1/model-versions/{model_version_id}/runs`
- `GET /api/v1/runs/{run_id}`
- `GET /api/v1/runs/{run_id}/artifacts`
- `GET /api/v1/runs/{run_id}/metrics`

### Calibration

- `POST /api/v1/model-versions/{model_version_id}/calibration-configs`
- `POST /api/v1/calibration-configs/{config_id}/run`
- `GET /api/v1/runs/{run_id}/calibration-result`

### Analytics

- `GET /api/v1/runs/{run_id}/scatterplot`
- `GET /api/v1/runs/{run_id}/cohort-dashboard`
- `GET /api/v1/runs/{run_id}/patients/{patient_index}/trace`

## Response Conventions

### Synchronous Create

Resources such as `clinical-series`, `compound-curves`, `probability-functions`, and
`calibration-configs` return `201 Created` with the newly created resource body.

### Asynchronous Execution

Execution endpoints such as `POST /runs` and `POST /calibration-configs/{id}/run` return
`202 Accepted` with a queued run summary.

### Errors

- `400` invalid payload or query parameters
- `404` resource not found
- `409` illegal state transition
- `422` schema validation error

## Core Request Shapes

### Clinical Series Create

```json
{
  "name": "Trial OS KM",
  "series_kind": "km_survival",
  "time_unit": "month",
  "value_unit": "survival_probability",
  "interpolation_method": "piecewise_linear",
  "points": [
    { "seq_no": 1, "time_value": 0, "estimate_value": 1.0 },
    { "seq_no": 2, "time_value": 3, "estimate_value": 0.92 }
  ]
}
```

### Probability Function Create

```json
{
  "name": "p_prog_from_os_curve",
  "function_kind": "prob_surv_comp_curve",
  "source_type": "compound_curve",
  "source_ref_id": "uuid",
  "cycle_length": 1,
  "time_unit": "month",
  "interpolation_method": "piecewise_linear"
}
```

### Run Create

```json
{
  "project_id": "uuid",
  "analysis_type": "psa",
  "template_id": "uuid",
  "random_seed": 20260325,
  "sampling_method": "lhs",
  "input_snapshot_json": {},
  "config_json": {
    "sample_size": 1000
  }
}
```

### Calibration Config Create

```json
{
  "name": "OS calibration",
  "target_series_id": "uuid",
  "objective_type": "weighted_sse",
  "optimizer_type": "de_plus_nm",
  "max_iterations": 500,
  "parameters": [
    {
      "parameter_code": "p_progression",
      "lower_bound": 0.001,
      "upper_bound": 0.25,
      "initial_value": 0.08
    }
  ]
}
```

## Notes For Implementation

- Auth is intentionally omitted from this skeleton.
- Long running execution should move to a queue-backed worker.
- Export-heavy responses should return artifact references, not inline blobs.

