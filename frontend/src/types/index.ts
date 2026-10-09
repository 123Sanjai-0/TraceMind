export interface Service {
  id: string;
  name: string;
  type: string;
  health_status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  request_rate: number;
  error_rate: number;
  avg_latency: number;
  p95_latency: number;
  p99_latency: number;
  cpu_util: number;
  memory_util: number;
  last_observed: string;
  is_simulated: boolean;
  metadata_json?: Record<string, any>;
}

export interface Anomaly {
  id: string;
  incident_id?: string;
  service_name: string;
  metric_name: string;
  observed_value: number;
  baseline_value: number;
  deviation_pct: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  detection_method: string;
  time_window: string;
  supporting_evidence?: string;
  is_simulated: boolean;
}

export interface RootCauseCandidate {
  id: string;
  incident_id: string;
  candidate_cause: string;
  affected_service: string;
  ranking_score: number;
  confidence_category: 'low' | 'medium' | 'high' | 'undetermined';
  rank_order: number;
  temporal_score: number;
  dependency_score: number;
  trace_score: number;
  metric_score: number;
  deployment_score: number;
  downstream_impact_count: number;
  supporting_evidence: string[];
  contradictory_evidence: string[];
  missing_evidence: string[];
  alternative_explanations: string[];
  affected_downstream_services: string[];
}

export interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  first_detected: string;
  last_updated: string;
  affected_services: string[];
  probable_root_cause?: string;
  summary?: string;
  confidence_category: 'low' | 'medium' | 'high' | 'undetermined';
  is_simulated: boolean;
  simulation_scenario?: string;
  anomalies?: Anomaly[];
  candidates?: RootCauseCandidate[];
}

export interface RecommendedAction {
  action: string;
  reason: string;
  supporting_evidence: string;
  expected_benefit: string;
  verification_procedure: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface LLMIncidentAnalysis {
  incident_summary: string;
  probable_root_cause: string;
  affected_services: string[];
  supporting_evidence: string[];
  contradictory_evidence: string[];
  confidence_category: 'low' | 'medium' | 'high';
  alternative_hypotheses: string[];
  recommended_actions: RecommendedAction[];
  verification_steps: string[];
  limitations: string[];
  rag_citations: Array<{
    doc_title: string;
    filename: string;
    similarity_score: number;
    excerpt: string;
  }>;
  is_ai_generated: boolean;
  model_name?: string;
}

export interface LogRecord {
  id: string;
  timestamp: string;
  service_name: string;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  trace_id?: string;
  span_id?: string;
  request_id?: string;
  message: string;
  error_type?: string;
  environment: string;
  deployment_version: string;
  is_simulated: boolean;
}

export interface MetricRecord {
  id: string;
  timestamp: string;
  service_name: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  environment: string;
  is_simulated: boolean;
}

export interface TraceSpan {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  service_name: string;
  operation_name: string;
  start_time: string;
  duration_ms: number;
  status_code: 'OK' | 'ERROR' | 'UNSET';
  error_message?: string;
  attributes_json: Record<string, any>;
  is_simulated: boolean;
}

export interface DeploymentEvent {
  id: string;
  service_name: string;
  previous_version: string;
  new_version: string;
  deployed_at: string;
  environment: string;
  change_description: string;
  commit_hash?: string;
  author: string;
  is_simulated: boolean;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  affected_services: string[];
  root_cause_service: string;
  scenario_type: string;
}

export interface SimulationResponse {
  simulation_id: string;
  scenario_id: string;
  scenario_name: string;
  incident: Incident;
  logs_generated_count: number;
  metrics_generated_count: number;
  traces_generated_count: number;
  anomalies_detected_count: number;
  ai_analysis?: LLMIncidentAnalysis;
  execution_time_ms: number;
  status: string;
}

export interface BenchmarkMetrics {
  top1_accuracy: number;
  top3_accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  detection_latency_ms: number;
  analysis_latency_ms: number;
}

export interface BenchmarkBaseline {
  name: string;
  description: string;
  metrics: BenchmarkMetrics;
}

export interface BenchmarkResult {
  total_test_scenarios: number;
  benchmark_execution_ms: number;
  baselines: {
    baseline_a_log_only: BenchmarkBaseline;
    baseline_b_multi_signal_no_graph: BenchmarkBaseline;
    proposed_tracemind: BenchmarkBaseline;
  };
  scenarios_evaluated: Array<{ id: string; name: string; ground_truth: string; type: string }>;
  analysis_discussion: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
  chunk_count: number;
  preview: string;
}

export interface PlanDefinition {
  id: string;
  name: string;
  tagline: string;
  monthly_price: number;
  yearly_price: number;
  max_services: number;
  max_spans_per_month: number;
  max_ai_rca_queries: number;
  retention_days: number;
  features: string[];
  is_popular?: boolean;
  badge?: string;
}

export interface SubscriptionData {
  id: string;
  plan_id: 'starter' | 'pro' | 'enterprise';
  plan_name: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  billing_cycle: 'monthly' | 'yearly';
  monthly_price_usd: number;
  current_period_start: string;
  current_period_end: string;
  max_services: number;
  max_spans_per_month: number;
  spans_consumed_this_month: number;
  max_ai_rca_queries_per_month: number;
  ai_rca_queries_consumed: number;
  retention_days: number;
  features: string[];
  payment_method: {
    brand?: string;
    last4?: string;
    exp?: string;
    name?: string;
  };
  invoices: Array<{
    id: string;
    date: string;
    amount: string;
    status: string;
    pdf_url: string;
  }>;
  available_plans: PlanDefinition[];
}

export interface UserQueryResponse {
  query_id: string;
  user_query: string;
  extracted_entities: string[];
  matched_services: string[];
  probable_root_cause: string;
  confidence_category: 'low' | 'medium' | 'high';
  ranking_score: number;
  analysis_explanation: LLMIncidentAnalysis;
  correlated_anomalies_count: number;
  correlated_spans_count: number;
  correlated_logs_count: number;
  created_at: string;
}


