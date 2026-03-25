CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    domain text NOT NULL DEFAULT 'healthcare',
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, slug)
);

CREATE TABLE models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    model_family text NOT NULL CHECK (model_family IN ('decision_tree', 'markov', 'partsa', 'microsim')),
    current_version_id uuid NULL,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    version_no integer NOT NULL,
    status text NOT NULL CHECK (status IN ('draft', 'released', 'archived')),
    base_version_id uuid NULL REFERENCES model_versions(id) ON DELETE SET NULL,
    graph_json jsonb NOT NULL,
    model_ir_json jsonb NOT NULL,
    expression_catalog_json jsonb NOT NULL,
    compiled_hash text NOT NULL,
    engine_compat_version text NOT NULL,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (model_id, version_no)
);

ALTER TABLE models
    ADD CONSTRAINT fk_models_current_version
    FOREIGN KEY (current_version_id) REFERENCES model_versions(id) ON DELETE SET NULL;

CREATE INDEX idx_model_versions_compiled_hash ON model_versions(compiled_hash);

CREATE TABLE model_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    code text NOT NULL,
    label text NOT NULL,
    data_type text NOT NULL,
    unit text NULL,
    value_kind text NOT NULL CHECK (value_kind IN ('scalar', 'distribution', 'formula', 'table_lookup', 'probability_function')),
    default_numeric_value numeric NULL,
    default_text_value text NULL,
    formula_expr text NULL,
    distribution_json jsonb NULL,
    bounds_json jsonb NULL,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_random boolean NOT NULL DEFAULT false,
    is_calibratable boolean NOT NULL DEFAULT false,
    UNIQUE (model_version_id, code)
);

CREATE INDEX idx_model_parameters_calibratable
    ON model_parameters(model_version_id, is_calibratable);

CREATE TABLE model_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    code text NOT NULL,
    label text NOT NULL,
    state_type text NOT NULL,
    group_code text NULL,
    sort_order integer NOT NULL,
    UNIQUE (model_version_id, code)
);

CREATE TABLE compound_curves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    curve_kind text NOT NULL CHECK (curve_kind IN ('survival', 'hazard')),
    time_unit text NOT NULL,
    definition_json jsonb NOT NULL,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical_series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    series_kind text NOT NULL CHECK (series_kind IN ('km_survival', 'survival_table', 'hazard_table', 'risk_table', 'external_curve')),
    time_unit text NOT NULL,
    value_unit text NOT NULL,
    interpolation_method text NOT NULL DEFAULT 'piecewise_linear',
    source_file_uri text NULL,
    source_metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical_series_points (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    series_id uuid NOT NULL REFERENCES clinical_series(id) ON DELETE CASCADE,
    seq_no integer NOT NULL,
    time_value numeric NOT NULL,
    estimate_value numeric NULL,
    lower_ci numeric NULL,
    upper_ci numeric NULL,
    at_risk integer NULL,
    events integer NULL,
    censored integer NULL,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (series_id, seq_no)
);

CREATE INDEX idx_clinical_series_points_time
    ON clinical_series_points(series_id, time_value);

CREATE TABLE curve_fits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id uuid NOT NULL REFERENCES clinical_series(id) ON DELETE CASCADE,
    fit_family text NOT NULL CHECK (fit_family IN ('exponential', 'weibull', 'gompertz', 'loglogistic', 'spline')),
    params_json jsonb NOT NULL,
    fit_stats_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE compound_curve_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    compound_curve_id uuid NOT NULL REFERENCES compound_curves(id) ON DELETE CASCADE,
    seq_no integer NOT NULL,
    segment_kind text NOT NULL CHECK (segment_kind IN ('series', 'fit', 'compound_curve_ref')),
    source_ref_id uuid NOT NULL,
    start_time numeric NOT NULL,
    end_time numeric NULL,
    blend_mode text NOT NULL DEFAULT 'hard_switch',
    blend_window numeric NULL,
    transform_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (compound_curve_id, seq_no)
);

CREATE TABLE probability_functions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    name text NOT NULL,
    function_kind text NOT NULL CHECK (function_kind IN ('prob_surv_table', 'prob_hazard_table', 'prob_surv_comp_curve', 'prob_haz_comp_curve')),
    source_type text NOT NULL CHECK (source_type IN ('clinical_series', 'compound_curve')),
    source_ref_id uuid NOT NULL,
    cycle_length numeric NOT NULL,
    time_unit text NOT NULL,
    interpolation_method text NOT NULL,
    options_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (model_version_id, name)
);

CREATE TABLE model_transitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    from_state_code text NOT NULL,
    to_state_code text NOT NULL,
    transition_type text NOT NULL,
    probability_expr text NULL,
    probability_function_id uuid NULL REFERENCES probability_functions(id) ON DELETE SET NULL,
    trigger_expr text NULL,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_model_transitions_version
    ON model_transitions(model_version_id, from_state_code, to_state_code);

CREATE TABLE analysis_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    analysis_type text NOT NULL CHECK (analysis_type IN ('markov_cohort', 'microsim', 'psa', 'calibration', 'plot_sensitivity', 'patient_dashboard')),
    name text NOT NULL,
    config_json jsonb NOT NULL,
    allowed_overrides_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
    analysis_type text NOT NULL CHECK (analysis_type IN ('markov_cohort', 'psa', 'calibration', 'plot_sensitivity', 'patient_dashboard', 'microsim')),
    template_id uuid NULL REFERENCES analysis_templates(id) ON DELETE SET NULL,
    parent_run_id uuid NULL REFERENCES runs(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    engine_version text NOT NULL,
    random_seed bigint NULL,
    sampling_method text NULL CHECK (sampling_method IN ('random', 'lhs')),
    input_snapshot_json jsonb NOT NULL,
    config_json jsonb NOT NULL,
    summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_log text NULL,
    submitted_by uuid NULL,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz NULL,
    finished_at timestamptz NULL
);

CREATE INDEX idx_runs_model_analysis_time
    ON runs(model_version_id, analysis_type, submitted_at DESC);

CREATE INDEX idx_runs_status_time
    ON runs(status, submitted_at);

CREATE INDEX idx_runs_parent
    ON runs(parent_run_id);

CREATE TABLE run_artifacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    artifact_type text NOT NULL CHECK (artifact_type IN ('plot_png', 'plot_csv', 'sample_matrix', 'calibration_overlay', 'patient_trace_parquet', 'report_pdf')),
    storage_uri text NOT NULL,
    checksum text NULL,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE run_metric_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    metric_key text NOT NULL,
    metric_label text NOT NULL,
    metric_scope text NOT NULL CHECK (metric_scope IN ('input_sample', 'model_output', 'incremental_output', 'patient_output', 'cohort_output')),
    data_type text NOT NULL,
    unit text NULL,
    strategy_code text NULL,
    comparator_strategy_code text NULL,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX idx_run_metric_catalog_unique
    ON run_metric_catalog (
        run_id,
        metric_key,
        COALESCE(strategy_code, ''),
        COALESCE(comparator_strategy_code, '')
    );

CREATE TABLE run_metric_values (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    sample_index integer NOT NULL,
    metric_catalog_id uuid NOT NULL REFERENCES run_metric_catalog(id) ON DELETE CASCADE,
    numeric_value double precision NULL,
    text_value text NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_metric_values_metric_sample
    ON run_metric_values(run_id, metric_catalog_id, sample_index);

CREATE INDEX idx_run_metric_values_sample
    ON run_metric_values(run_id, sample_index);

CREATE TABLE sample_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    sampler_type text NOT NULL CHECK (sampler_type IN ('random', 'lhs')),
    sample_size integer NOT NULL,
    dimension_count integer NOT NULL,
    random_seed bigint NOT NULL,
    storage_uri text NOT NULL,
    checksum text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE calibration_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id uuid NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    name text NOT NULL,
    target_series_id uuid NOT NULL REFERENCES clinical_series(id) ON DELETE RESTRICT,
    objective_type text NOT NULL CHECK (objective_type IN ('weighted_sse')),
    optimizer_type text NOT NULL CHECK (optimizer_type IN ('de', 'nelder_mead', 'de_plus_nm')),
    max_iterations integer NOT NULL,
    config_json jsonb NOT NULL,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE calibration_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calibration_config_id uuid NOT NULL REFERENCES calibration_configs(id) ON DELETE CASCADE,
    parameter_code text NOT NULL,
    lower_bound numeric NOT NULL,
    upper_bound numeric NOT NULL,
    initial_value numeric NULL,
    transform_type text NOT NULL DEFAULT 'identity',
    is_fixed boolean NOT NULL DEFAULT false,
    CHECK (lower_bound < upper_bound)
);

CREATE UNIQUE INDEX idx_calibration_parameters_unique
    ON calibration_parameters(calibration_config_id, parameter_code);

CREATE TABLE calibration_results (
    run_id uuid PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
    calibration_config_id uuid NOT NULL REFERENCES calibration_configs(id) ON DELETE RESTRICT,
    convergence_status text NOT NULL,
    best_objective_value numeric NOT NULL,
    best_params_json jsonb NOT NULL,
    diagnostics_json jsonb NOT NULL,
    overlay_artifact_id uuid NULL REFERENCES run_artifacts(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patient_entities (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    patient_index integer NOT NULL,
    baseline_json jsonb NOT NULL,
    subgroup_key text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (run_id, patient_index)
);

CREATE TABLE patient_state_events (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    patient_index integer NOT NULL,
    event_seq integer NOT NULL,
    cycle_index integer NULL,
    event_time numeric NOT NULL,
    from_state_code text NULL,
    to_state_code text NULL,
    event_type text NOT NULL,
    tracker_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (run_id, patient_index, event_seq)
);

CREATE INDEX idx_patient_state_events_time
    ON patient_state_events(run_id, event_time);

CREATE INDEX idx_patient_state_events_state_time
    ON patient_state_events(run_id, to_state_code, event_time);

CREATE TABLE cohort_aggregates (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    bucket_time numeric NOT NULL,
    state_code text NOT NULL,
    subgroup_key text NULL,
    occupancy_count integer NOT NULL,
    inflow_count integer NOT NULL DEFAULT 0,
    outflow_count integer NOT NULL DEFAULT 0,
    metric_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_cohort_aggregates_bucket
    ON cohort_aggregates(run_id, bucket_time, state_code, subgroup_key);
