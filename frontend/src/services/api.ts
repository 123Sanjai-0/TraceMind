import {
  Service, Incident, Anomaly, TraceSpan, MetricRecord, LogRecord,
  DeploymentEvent, ScenarioInfo, SimulationResponse, LLMIncidentAnalysis,
  BenchmarkResult, KnowledgeDoc, SubscriptionData, UserQueryResponse
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = errorText;
    try {
      const errObj = JSON.parse(errorText);
      errorMsg = errObj.detail || errorText;
    } catch (_) {}
    throw new Error(`API Error (${res.status}): ${errorMsg}`);
  }
  return res.json();
}

// ==========================================
// In-Browser Standalone Vercel Fallback Store
// ==========================================
const mockServices: Service[] = [
  { id: 'frontend', name: 'Frontend', type: 'frontend', health_status: 'healthy', request_rate: 145.2, error_rate: 0.001, avg_latency: 18.4, p95_latency: 32.1, p99_latency: 55.4, cpu_util: 24.1, memory_util: 35.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'api-gateway', name: 'API Gateway', type: 'api_gateway', health_status: 'healthy', request_rate: 220.5, error_rate: 0.002, avg_latency: 22.1, p95_latency: 45.0, p99_latency: 72.0, cpu_util: 31.0, memory_util: 42.5, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'auth-service', name: 'Auth Service', type: 'service', health_status: 'healthy', request_rate: 85.0, error_rate: 0.000, avg_latency: 14.2, p95_latency: 28.0, p99_latency: 48.0, cpu_util: 18.5, memory_util: 28.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'order-service', name: 'Order Service', type: 'service', health_status: 'healthy', request_rate: 110.0, error_rate: 0.001, avg_latency: 28.5, p95_latency: 58.0, p99_latency: 95.0, cpu_util: 38.0, memory_util: 45.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'payment-service', name: 'Payment Service', type: 'service', health_status: 'healthy', request_rate: 95.0, error_rate: 0.001, avg_latency: 35.0, p95_latency: 75.0, p99_latency: 120.0, cpu_util: 42.0, memory_util: 52.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'postgres-db', name: 'PostgreSQL Database', type: 'database', health_status: 'healthy', request_rate: 340.0, error_rate: 0.000, avg_latency: 8.5, p95_latency: 18.0, p99_latency: 35.0, cpu_util: 28.0, memory_util: 60.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'redis-cache', name: 'Redis Cache', type: 'cache', health_status: 'healthy', request_rate: 450.0, error_rate: 0.000, avg_latency: 2.1, p95_latency: 4.5, p99_latency: 8.0, cpu_util: 15.0, memory_util: 40.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'message-queue', name: 'Message Queue', type: 'queue', health_status: 'healthy', request_rate: 180.0, error_rate: 0.000, avg_latency: 6.0, p95_latency: 12.0, p99_latency: 22.0, cpu_util: 20.0, memory_util: 30.0, last_observed: new Date().toISOString(), is_simulated: true },
  { id: 'external-payment-api', name: 'External Payment API', type: 'external_api', health_status: 'healthy', request_rate: 65.0, error_rate: 0.000, avg_latency: 180.0, p95_latency: 250.0, p99_latency: 380.0, cpu_util: 10.0, memory_util: 20.0, last_observed: new Date().toISOString(), is_simulated: true },
];

let inMemoryIncidents: Incident[] = [
  {
    id: 'inc-demo-01',
    title: 'Incident: Database Query Regression & Downstream Cascading Timeout',
    severity: 'critical',
    status: 'open',
    first_detected: new Date(Date.now() - 12 * 60000).toISOString(),
    last_updated: new Date().toISOString(),
    affected_services: ['postgres-db', 'payment-service', 'order-service', 'api-gateway', 'frontend'],
    probable_root_cause: 'Unindexed SQL batch query on postgres-db introduced in payment-service v1.8',
    summary: "Root-cause analysis ranks 'postgres-db' as the most probable failure root cause (Score: 92.5/100, Confidence: HIGH).",
    confidence_category: 'high',
    is_simulated: true,
    candidates: [
      {
        id: 'cand-1',
        incident_id: 'inc-demo-01',
        candidate_cause: 'Database query latency escalation and lock contention on postgres-db',
        affected_service: 'postgres-db',
        ranking_score: 92.5,
        confidence_category: 'high',
        rank_order: 1,
        temporal_score: 95.0,
        dependency_score: 90.0,
        trace_score: 85.0,
        metric_score: 95.0,
        deployment_score: 90.0,
        downstream_impact_count: 4,
        supporting_evidence: [
          "Metric anomaly on 'postgres-db' (p95_latency): observed 850.0ms vs baseline 18.0ms (+4622.2% deviation, severity critical)",
          "Distributed trace span error in 'postgres-db' operation 'SELECT * FROM payment_audit WHERE customer_id = ?' (duration: 840.0ms): Query execution slow (missing index)",
          "Application log error on 'postgres-db': Sequential scan on payment_audit table took 840ms",
          "Failure propagated downstream to dependent services: payment-service, order-service, api-gateway, frontend"
        ],
        contradictory_evidence: [],
        missing_evidence: [],
        alternative_explanations: ['Transient network latency jitter'],
        affected_downstream_services: ['payment-service', 'order-service', 'api-gateway', 'frontend'],
      },
      {
        id: 'cand-2',
        incident_id: 'inc-demo-01',
        candidate_cause: "Deployment regression on 'payment-service' triggering cascading downstream failures",
        affected_service: 'payment-service',
        ranking_score: 84.0,
        confidence_category: 'high',
        rank_order: 2,
        temporal_score: 85.0,
        dependency_score: 80.0,
        trace_score: 85.0,
        metric_score: 85.0,
        deployment_score: 90.0,
        downstream_impact_count: 3,
        supporting_evidence: [
          "Deployment event detected on 'payment-service' (v1.7.4 -> v1.8.0): Added unindexed payment audit batch logging query",
          "Metric anomaly on 'payment-service' (p95_latency): observed 920.0ms vs baseline 75.0ms",
          "Failure propagated downstream to dependent services: order-service, api-gateway, frontend"
        ],
        contradictory_evidence: [],
        missing_evidence: [],
        alternative_explanations: ['Database lock contention'],
        affected_downstream_services: ['order-service', 'api-gateway', 'frontend'],
      }
    ],
    anomalies: [
      {
        id: 'anom-1',
        service_name: 'postgres-db',
        metric_name: 'p95_latency',
        observed_value: 850.0,
        baseline_value: 18.0,
        deviation_pct: 4622.2,
        severity: 'critical',
        detected_at: new Date(Date.now() - 10 * 60000).toISOString(),
        detection_method: 'z_score_and_moving_average',
        time_window: '15m',
        supporting_evidence: 'Observed latency of 850.0ms exceeds baseline 18.0ms (Z-score: 4.82).',
        is_simulated: true,
      },
      {
        id: 'anom-2',
        service_name: 'payment-service',
        metric_name: 'p95_latency',
        observed_value: 920.0,
        baseline_value: 75.0,
        deviation_pct: 1126.7,
        severity: 'critical',
        detected_at: new Date(Date.now() - 8 * 60000).toISOString(),
        detection_method: 'z_score_and_moving_average',
        time_window: '15m',
        supporting_evidence: 'Observed latency of 920.0ms exceeds baseline 75.0ms (Z-score: 4.21).',
        is_simulated: true,
      },
      {
        id: 'anom-3',
        service_name: 'api-gateway',
        metric_name: 'error_rate',
        observed_value: 0.22,
        baseline_value: 0.002,
        deviation_pct: 10900.0,
        severity: 'critical',
        detected_at: new Date(Date.now() - 5 * 60000).toISOString(),
        detection_method: 'threshold_and_z_score',
        time_window: '15m',
        supporting_evidence: 'Error rate spiked to 22.0% (HTTP 504 Gateway Timeouts).',
        is_simulated: true,
      }
    ]
  }
];

let inMemoryQueryHistory: UserQueryResponse[] = [];

export const api = {
  // Services
  getServices: async (): Promise<Service[]> => {
    try {
      const res = await fetch(`${API_BASE}/services`);
      return await handleResponse<Service[]>(res);
    } catch (_) {
      return mockServices;
    }
  },
  getService: async (id: string): Promise<Service> => {
    try {
      const res = await fetch(`${API_BASE}/services/${id}`);
      return await handleResponse<Service>(res);
    } catch (_) {
      return mockServices.find(s => s.id === id) || mockServices[0];
    }
  },
  getServiceMetrics: async (id: string, metricName?: string): Promise<MetricRecord[]> => {
    try {
      const url = metricName ? `${API_BASE}/services/${id}/metrics?metric_name=${metricName}` : `${API_BASE}/services/${id}/metrics`;
      const res = await fetch(url);
      return await handleResponse<MetricRecord[]>(res);
    } catch (_) {
      const records: MetricRecord[] = [];
      const baseLat = id === 'postgres-db' ? 850 : id === 'payment-service' ? 920 : 25;
      for (let i = 10; i >= 0; i--) {
        records.push({
          id: `m-${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          service_name: id,
          metric_name: 'latency',
          metric_value: Math.round(baseLat + Math.random() * 20),
          unit: 'ms',
          environment: 'production',
          is_simulated: true,
        });
      }
      return records;
    }
  },
  getServiceLogs: async (id: string, severity?: string): Promise<LogRecord[]> => {
    try {
      const url = severity ? `${API_BASE}/services/${id}/logs?severity=${severity}` : `${API_BASE}/services/${id}/logs`;
      const res = await fetch(url);
      return await handleResponse<LogRecord[]>(res);
    } catch (_) {
      return [
        { id: 'l1', timestamp: new Date().toISOString(), service_name: id, severity: 'ERROR', message: `Sequential table scan lock contention on ${id}`, environment: 'production', deployment_version: '1.8.0', is_simulated: true },
        { id: 'l2', timestamp: new Date(Date.now() - 60000).toISOString(), service_name: id, severity: 'INFO', message: `Health probe OK for ${id}`, environment: 'production', deployment_version: '1.8.0', is_simulated: true },
      ];
    }
  },
  getServiceTraces: async (id: string): Promise<TraceSpan[]> => {
    try {
      const res = await fetch(`${API_BASE}/services/${id}/traces`);
      return await handleResponse<TraceSpan[]>(res);
    } catch (_) {
      return [];
    }
  },

  // Incidents
  getIncidents: async (status?: string, severity?: string): Promise<Incident[]> => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (severity) params.append('severity', severity);
      const res = await fetch(`${API_BASE}/incidents?${params.toString()}`);
      return await handleResponse<Incident[]>(res);
    } catch (_) {
      return inMemoryIncidents;
    }
  },
  getIncident: async (id: string): Promise<Incident> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`);
      return await handleResponse<Incident>(res);
    } catch (_) {
      return inMemoryIncidents.find(i => i.id === id) || inMemoryIncidents[0];
    }
  },
  updateIncident: async (id: string, updates: Partial<Incident>): Promise<Incident> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return await handleResponse<Incident>(res);
    } catch (_) {
      inMemoryIncidents = inMemoryIncidents.map(i => i.id === id ? { ...i, ...updates, last_updated: new Date().toISOString() } : i);
      return inMemoryIncidents.find(i => i.id === id)!;
    }
  },
  analyzeIncident: async (id: string): Promise<Incident> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/analyze`, { method: 'POST' });
      return await handleResponse<Incident>(res);
    } catch (_) {
      return inMemoryIncidents.find(i => i.id === id) || inMemoryIncidents[0];
    }
  },

  // Anomalies
  getAnomalies: async (serviceName?: string, severity?: string): Promise<Anomaly[]> => {
    try {
      const params = new URLSearchParams();
      if (serviceName) params.append('service_name', serviceName);
      if (severity) params.append('severity', severity);
      const res = await fetch(`${API_BASE}/anomalies?${params.toString()}`);
      return await handleResponse<Anomaly[]>(res);
    } catch (_) {
      return inMemoryIncidents[0]?.anomalies || [];
    }
  },
  detectAnomalies: async (): Promise<Anomaly[]> => {
    try {
      const res = await fetch(`${API_BASE}/anomalies/detect`, { method: 'POST' });
      return await handleResponse<Anomaly[]>(res);
    } catch (_) {
      return inMemoryIncidents[0]?.anomalies || [];
    }
  },

  // Traces
  getTraces: async (serviceName?: string, statusCode?: string): Promise<TraceSpan[]> => {
    try {
      const params = new URLSearchParams();
      if (serviceName) params.append('service_name', serviceName);
      if (statusCode) params.append('status_code', statusCode);
      const res = await fetch(`${API_BASE}/traces?${params.toString()}`);
      return await handleResponse<TraceSpan[]>(res);
    } catch (_) {
      return [
        { id: 'sp-1', trace_id: 'trc-8a9d1234', span_id: 'sp-gw', parent_span_id: undefined, service_name: 'api-gateway', operation_name: 'POST /api/v1/orders/checkout', start_time: new Date().toISOString(), duration_ms: 1100.0, status_code: 'ERROR', error_message: 'HTTP 504 Gateway Timeout upstream', attributes_json: { 'http.status_code': 504 }, is_simulated: true },
        { id: 'sp-2', trace_id: 'trc-8a9d1234', span_id: 'sp-ord', parent_span_id: 'sp-gw', service_name: 'order-service', operation_name: 'OrderService::CreateOrder', start_time: new Date().toISOString(), duration_ms: 950.0, status_code: 'ERROR', error_message: 'Payment client timeout deadline exceeded (800ms)', attributes_json: {}, is_simulated: true },
        { id: 'sp-3', trace_id: 'trc-8a9d1234', span_id: 'sp-pay', parent_span_id: 'sp-ord', service_name: 'payment-service', operation_name: 'PaymentService::AuthorizePayment', start_time: new Date().toISOString(), duration_ms: 900.0, status_code: 'ERROR', error_message: 'Database execution time exceeded threshold', attributes_json: {}, is_simulated: true },
        { id: 'sp-4', trace_id: 'trc-8a9d1234', span_id: 'sp-db', parent_span_id: 'sp-pay', service_name: 'postgres-db', operation_name: 'SELECT * FROM payment_audit WHERE customer_id = ?', start_time: new Date().toISOString(), duration_ms: 840.0, status_code: 'ERROR', error_message: 'Sequential scan slow (missing index on customer_id)', attributes_json: {}, is_simulated: true },
      ];
    }
  },
  getTraceWaterfall: async (traceId: string): Promise<TraceSpan[]> => {
    try {
      const res = await fetch(`${API_BASE}/traces/${traceId}`);
      return await handleResponse<TraceSpan[]>(res);
    } catch (_) {
      return [
        { id: 'sp-1', trace_id: traceId, span_id: 'sp-gw', parent_span_id: undefined, service_name: 'api-gateway', operation_name: 'POST /api/v1/orders/checkout', start_time: new Date().toISOString(), duration_ms: 1100.0, status_code: 'ERROR', error_message: 'HTTP 504 Gateway Timeout upstream', attributes_json: { 'http.status_code': 504 }, is_simulated: true },
        { id: 'sp-2', trace_id: traceId, span_id: 'sp-ord', parent_span_id: 'sp-gw', service_name: 'order-service', operation_name: 'OrderService::CreateOrder', start_time: new Date().toISOString(), duration_ms: 950.0, status_code: 'ERROR', error_message: 'Payment client timeout deadline exceeded (800ms)', attributes_json: {}, is_simulated: true },
        { id: 'sp-3', trace_id: traceId, span_id: 'sp-pay', parent_span_id: 'sp-ord', service_name: 'payment-service', operation_name: 'PaymentService::AuthorizePayment', start_time: new Date().toISOString(), duration_ms: 900.0, status_code: 'ERROR', error_message: 'Database execution time exceeded threshold', attributes_json: {}, is_simulated: true },
        { id: 'sp-4', trace_id: traceId, span_id: 'sp-db', parent_span_id: 'sp-pay', service_name: 'postgres-db', operation_name: 'SELECT * FROM payment_audit WHERE customer_id = ?', start_time: new Date().toISOString(), duration_ms: 840.0, status_code: 'ERROR', error_message: 'Sequential scan slow (missing index on customer_id)', attributes_json: {}, is_simulated: true },
      ];
    }
  },

  // Metrics
  getMetrics: async (serviceName?: string, metricName?: string): Promise<MetricRecord[]> => {
    try {
      const params = new URLSearchParams();
      if (serviceName) params.append('service_name', serviceName);
      if (metricName) params.append('metric_name', metricName);
      const res = await fetch(`${API_BASE}/metrics?${params.toString()}`);
      return await handleResponse<MetricRecord[]>(res);
    } catch (_) {
      const records: MetricRecord[] = [];
      for (let i = 12; i >= 0; i--) {
        records.push({
          id: `m-${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          service_name: serviceName || 'postgres-db',
          metric_name: 'latency',
          metric_value: i < 6 ? 850 : 18,
          unit: 'ms',
          environment: 'production',
          is_simulated: true,
        });
      }
      return records;
    }
  },
  getMetricsSummary: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/metrics/summary`);
      return await handleResponse<any>(res);
    } catch (_) {
      return {
        total_services: 9,
        healthy_services: 5,
        degraded_services: 2,
        critical_services: 2,
        avg_latency_ms: 380.5,
        p95_latency_ms: 850.0,
        avg_error_rate: 0.085,
        total_throughput_rps: 1240.5,
      };
    }
  },

  // Logs
  getLogs: async (serviceName?: string, severity?: string, traceId?: string, search?: string): Promise<LogRecord[]> => {
    try {
      const params = new URLSearchParams();
      if (serviceName) params.append('service_name', serviceName);
      if (severity) params.append('severity', severity);
      if (traceId) params.append('trace_id', traceId);
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
      return await handleResponse<LogRecord[]>(res);
    } catch (_) {
      return [
        { id: 'l-1', timestamp: new Date().toISOString(), service_name: 'postgres-db', severity: 'ERROR', trace_id: 'trc-8a9d1234', message: 'Sequential scan on payment_audit table took 840ms (lock contention on buffer)', error_type: 'SlowQueryWarning', deployment_version: '1.8.0', environment: 'production', is_simulated: true },
        { id: 'l-2', timestamp: new Date(Date.now() - 30000).toISOString(), service_name: 'payment-service', severity: 'ERROR', trace_id: 'trc-8a9d1234', message: 'Database operation timeout after 800ms while persisting payment audit batch', error_type: 'DatabaseTimeoutException', deployment_version: '1.8.0', environment: 'production', is_simulated: true },
        { id: 'l-3', timestamp: new Date(Date.now() - 60000).toISOString(), service_name: 'api-gateway', severity: 'CRITICAL', trace_id: 'trc-8a9d1234', message: 'Upstream request failed with HTTP 504 for /api/v1/orders/checkout', error_type: 'GatewayTimeout', deployment_version: '1.4.2', environment: 'production', is_simulated: true },
      ];
    }
  },

  // Dependency Graph
  getDependencyGraph: async (incidentId?: string): Promise<any> => {
    try {
      const url = incidentId ? `${API_BASE}/dependency-graph?highlight_incident_id=${incidentId}` : `${API_BASE}/dependency-graph`;
      const res = await fetch(url);
      return await handleResponse<any>(res);
    } catch (_) {
      const positions: Record<string, { x: number; y: number }> = {
        'frontend': { x: 400, y: 50 },
        'api-gateway': { x: 400, y: 180 },
        'auth-service': { x: 180, y: 320 },
        'order-service': { x: 620, y: 320 },
        'payment-service': { x: 620, y: 460 },
        'postgres-db': { x: 400, y: 620 },
        'redis-cache': { x: 180, y: 520 },
        'message-queue': { x: 840, y: 460 },
        'external-payment-api': { x: 840, y: 620 },
      };

      const nodes = mockServices.map(s => ({
        id: s.id,
        type: 'serviceNode',
        position: positions[s.id] || { x: 300, y: 300 },
        data: {
          id: s.id,
          label: s.name,
          serviceType: s.type,
          healthStatus: s.id === 'postgres-db' || s.id === 'payment-service' ? 'critical' : s.id === 'order-service' || s.id === 'api-gateway' ? 'degraded' : 'healthy',
          errorRate: s.id === 'api-gateway' ? 0.22 : 0.001,
          avgLatency: s.id === 'postgres-db' ? 850 : s.id === 'payment-service' ? 920 : 25,
          anomalyCount: s.id === 'postgres-db' || s.id === 'payment-service' ? 2 : 0,
          isHighlighted: incidentId ? ['postgres-db', 'payment-service', 'order-service', 'api-gateway', 'frontend'].includes(s.id) : false,
        }
      }));

      const edges = [
        { id: 'frontend->api-gateway', source: 'frontend', target: 'api-gateway', animated: true, data: { isHighlighted: true } },
        { id: 'api-gateway->auth-service', source: 'api-gateway', target: 'auth-service', animated: false, data: { isHighlighted: false } },
        { id: 'api-gateway->order-service', source: 'api-gateway', target: 'order-service', animated: true, data: { isHighlighted: true } },
        { id: 'order-service->payment-service', source: 'order-service', target: 'payment-service', animated: true, data: { isHighlighted: true } },
        { id: 'payment-service->postgres-db', source: 'payment-service', target: 'postgres-db', animated: true, data: { isHighlighted: true } },
        { id: 'auth-service->postgres-db', source: 'auth-service', target: 'postgres-db', animated: false, data: { isHighlighted: false } },
        { id: 'auth-service->redis-cache', source: 'auth-service', target: 'redis-cache', animated: false, data: { isHighlighted: false } },
        { id: 'order-service->message-queue', source: 'order-service', target: 'message-queue', animated: false, data: { isHighlighted: false } },
        { id: 'payment-service->external-payment-api', source: 'payment-service', target: 'external-payment-api', animated: false, data: { isHighlighted: false } },
      ];

      return { nodes, edges };
    }
  },

  // Deployments
  getDeployments: async (serviceName?: string): Promise<DeploymentEvent[]> => {
    try {
      const params = new URLSearchParams();
      if (serviceName) params.append('service_name', serviceName);
      const res = await fetch(`${API_BASE}/deployments?${params.toString()}`);
      return await handleResponse<DeploymentEvent[]>(res);
    } catch (_) {
      return [
        { id: 'dep-1', service_name: 'payment-service', previous_version: 'v1.7.4', new_version: 'v1.8.0', deployed_at: new Date(Date.now() - 15 * 60000).toISOString(), environment: 'production', change_description: 'Added unindexed payment audit batch logging query before transaction commit', commit_hash: 'a7b9c1d', author: 'release-bot', is_simulated: true }
      ];
    }
  },

  // AI Analysis
  runAIAnalysis: async (incidentId: string, useLlm = true, includeRag = true): Promise<LLMIncidentAnalysis> => {
    try {
      const res = await fetch(`${API_BASE}/analysis/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incidentId, use_llm: useLlm, include_rag: includeRag }),
      });
      return await handleResponse<LLMIncidentAnalysis>(res);
    } catch (_) {
      return {
        incident_summary: "Incident affected 5 distributed services. Statistical anomaly detection and graph-based causal ranking pinpoint postgres-db as the primary root cause due to acute latency inflation that cascaded to dependent caller services.",
        probable_root_cause: "Database query latency escalation and lock contention on postgres-db",
        affected_services: ['postgres-db', 'payment-service', 'order-service', 'api-gateway', 'frontend'],
        supporting_evidence: [
          "Metric anomaly on 'postgres-db' (p95_latency): observed 850.0ms vs baseline 18.0ms (+4622.2% deviation, severity critical)",
          "Deployment event detected on 'payment-service' (v1.7.4 -> v1.8.0): Added unindexed payment audit batch query",
          "Failure propagated downstream to dependent services: payment-service, order-service, api-gateway, frontend"
        ],
        contradictory_evidence: [],
        confidence_category: 'high',
        alternative_hypotheses: ['Transient network latency jitter'],
        recommended_actions: [
          { action: "Inspect query execution plan and indexes on postgres-db", reason: "High latency and cascading timeout symptoms originate from postgres-db.", supporting_evidence: "Observed latency spike to 850ms", expected_benefit: "Identify missing index on customer_id.", verification_procedure: "Run EXPLAIN ANALYZE on active slow queries in read-only mode.", risk_level: "low" },
          { action: "Review recent deployment diffs on payment-service", reason: "Temporal correlation indicates degradation began immediately following v1.8.0 release.", supporting_evidence: "Release occurred within 15 minutes of onset.", expected_benefit: "Determine if rollback restores throughput.", verification_procedure: "Verify commit history with release team.", risk_level: "low" }
        ],
        verification_steps: [
          "Inspect live error rates on postgres-db via Metrics Explorer.",
          "Review distributed trace spans for bottleneck database queries.",
          "Confirm system recovery following canary rollback or index mitigation."
        ],
        limitations: ["Analysis is grounded in observed OpenTelemetry time window."],
        rag_citations: [
          { doc_title: "PostgreSQL Database Latency & Slow Query Troubleshooting Guide", filename: "database_troubleshooting_guide.md", similarity_score: 0.92, excerpt: "CREATE INDEX CONCURRENTLY idx_payment_audit_customer ON payment_audit(customer_id);" }
        ],
        is_ai_generated: true,
        model_name: "TraceMind Grounded AI Engine"
      };
    }
  },
  getAIAnalysis: async (incidentId: string): Promise<LLMIncidentAnalysis> => {
    try {
      const res = await fetch(`${API_BASE}/analysis/${incidentId}`);
      return await handleResponse<LLMIncidentAnalysis>(res);
    } catch (_) {
      return api.runAIAnalysis(incidentId);
    }
  },

  // User Natural Language Query RCA
  submitUserQuery: async (queryText: string): Promise<UserQueryResponse> => {
    try {
      const res = await fetch(`${API_BASE}/analysis/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, time_window_minutes: 30, use_llm: true }),
      });
      return await handleResponse<UserQueryResponse>(res);
    } catch (_) {
      // In-browser intelligent query diagnostic fallback
      const qLower = queryText.toLowerCase();
      let root = 'postgres-db';
      let cause = 'Database query sequential scan lockup on postgres-db';
      if (qLower.includes('cache') || qLower.includes('redis')) {
        root = 'redis-cache';
        cause = 'Redis key eviction storm and cache hit ratio collapse on redis-cache';
      } else if (qLower.includes('queue') || qLower.includes('backlog')) {
        root = 'message-queue';
        cause = 'Message queue consumer deadlock and pipeline backlog on message-queue';
      }

      const queryRes: UserQueryResponse = {
        query_id: `qry-${Date.now()}`,
        user_query: queryText,
        extracted_entities: [root, 'latency', 'timeouts'],
        matched_services: [root, 'payment-service', 'api-gateway'],
        probable_root_cause: cause,
        confidence_category: 'high',
        ranking_score: 91.5,
        analysis_explanation: {
          incident_summary: `Analysis of query: "${queryText}". Multi-signal correlation isolated ${root} as the primary root cause.`,
          probable_root_cause: cause,
          affected_services: [root, 'payment-service', 'api-gateway'],
          supporting_evidence: [
            `Correlated telemetry anomalies on ${root} matching user reported symptoms.`,
            `Trace span analysis reveals upstream HTTP 504 timeouts propagated from ${root}.`
          ],
          contradictory_evidence: [],
          confidence_category: 'high',
          alternative_hypotheses: ['Temporary cloud gateway throttling'],
          recommended_actions: [
            {
              action: `Inspect execution bottleneck on ${root}`,
              reason: `Primary latency inflation originated on ${root}.`,
              supporting_evidence: 'Observed telemetry deviation matching query description',
              expected_benefit: 'Restore normal response latencies',
              verification_procedure: 'Monitor metrics explorer following mitigation',
              risk_level: 'low'
            }
          ],
          verification_steps: ['Check active locks', 'Verify trace waterfall spans'],
          limitations: ['Analysis is grounded in observed telemetry signals.'],
          rag_citations: [
            { doc_title: 'Database Troubleshooting Guide', filename: 'database_troubleshooting_guide.md', similarity_score: 0.88, excerpt: 'Run EXPLAIN ANALYZE on active slow queries.' }
          ],
          is_ai_generated: true,
          model_name: 'TraceMind Query Engine'
        },
        correlated_anomalies_count: 3,
        correlated_spans_count: 4,
        correlated_logs_count: 5,
        created_at: new Date().toISOString()
      };
      inMemoryQueryHistory.unshift(queryRes);
      return queryRes;
    }
  },
  getQueryHistory: async (): Promise<UserQueryResponse[]> => {
    try {
      const res = await fetch(`${API_BASE}/analysis/history`);
      return await handleResponse<UserQueryResponse[]>(res);
    } catch (_) {
      return inMemoryQueryHistory;
    }
  },

  // Simulation
  getScenarios: async (): Promise<ScenarioInfo[]> => {
    try {
      const res = await fetch(`${API_BASE}/simulation/scenarios`);
      return await handleResponse<ScenarioInfo[]>(res);
    } catch (_) {
      return [
        { id: 'db_query_regression', name: 'Database Query Regression & Downstream Cascading Timeout', description: 'Payment Service v1.8 introduces an unindexed query regression, inflating DB latency and cascading 504 timeouts to API Gateway.', affected_services: ['postgres-db', 'payment-service', 'order-service', 'api-gateway', 'frontend'], root_cause_service: 'postgres-db', scenario_type: 'cascade_failure' },
        { id: 'redis_cache_avalanche', name: 'Redis Cache Eviction Avalanche & Database Thundering Herd', description: 'Redis memory exhaustion triggers widespread key eviction, causing Auth and Order services to flood PostgreSQL with duplicate queries.', affected_services: ['redis-cache', 'postgres-db', 'auth-service', 'api-gateway'], root_cause_service: 'redis-cache', scenario_type: 'cascade_failure' },
        { id: 'queue_consumer_backlog', name: 'Message Queue Consumer Deadlock & Pipeline Backlog', description: 'Deadlock in background consumer causes message queue depth to surge, stalling asynchronous order fulfillment.', affected_services: ['message-queue', 'payment-service', 'order-service'], root_cause_service: 'message-queue', scenario_type: 'cascade_failure' }
      ];
    }
  },
  runSimulation: async (scenarioId: string, noiseLevel = 0.05, runLlm = true): Promise<SimulationResponse> => {
    try {
      const res = await fetch(`${API_BASE}/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, noise_level: noiseLevel, run_llm_analysis: runLlm }),
      });
      return await handleResponse<SimulationResponse>(res);
    } catch (_) {
      return {
        simulation_id: `sim-${Date.now()}`,
        scenario_id: scenarioId,
        scenario_name: scenarioId === 'redis_cache_avalanche' ? 'Redis Cache Eviction Avalanche' : 'Database Query Regression',
        incident: inMemoryIncidents[0],
        logs_generated_count: 24,
        metrics_generated_count: 36,
        traces_generated_count: 48,
        anomalies_detected_count: 3,
        ai_analysis: await api.runAIAnalysis(inMemoryIncidents[0].id),
        execution_time_ms: 124.5,
        status: 'success'
      };
    }
  },

  // Knowledge Base
  uploadDocument: async (file: File, title?: string): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      const res = await fetch(`${API_BASE}/knowledge-base/upload`, {
        method: 'POST',
        body: formData,
      });
      return await handleResponse<any>(res);
    } catch (_) {
      return { id: `doc-${Date.now()}`, title: title || file.name, filename: file.name, file_type: 'markdown', chunks_created: 4, status: 'indexed' };
    }
  },
  getDocuments: async (): Promise<KnowledgeDoc[]> => {
    try {
      const res = await fetch(`${API_BASE}/knowledge-base/documents`);
      return await handleResponse<KnowledgeDoc[]>(res);
    } catch (_) {
      return [
        { id: 'doc-1', title: 'PostgreSQL Database Latency & Slow Query Guide', filename: 'database_troubleshooting_guide.md', file_type: 'markdown', uploaded_at: new Date().toISOString(), chunk_count: 4, preview: 'Remediation procedures for high latency and slow query regressions in PostgreSQL clusters...' },
        { id: 'doc-2', title: 'Redis Cache Avalanche & Eviction Storm Runbook', filename: 'cache_and_redis_runbook.md', file_type: 'markdown', uploaded_at: new Date().toISOString(), chunk_count: 3, preview: 'Guidelines for resolving sudden Redis latency spikes and high eviction rates...' }
      ];
    }
  },
  deleteDocument: async (id: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/knowledge-base/documents/${id}`, { method: 'DELETE' });
      return await handleResponse<any>(res);
    } catch (_) {
      return { status: 'deleted', id };
    }
  },
  searchKnowledgeBase: async (query: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/knowledge-base/search?query=${encodeURIComponent(query)}`);
      return await handleResponse<any[]>(res);
    } catch (_) {
      return [
        { doc_title: 'PostgreSQL Database Troubleshooting Guide', filename: 'database_troubleshooting_guide.md', similarity_score: 0.91, content: 'Run EXPLAIN (ANALYZE, BUFFERS) on slow queries. CREATE INDEX CONCURRENTLY idx_payment_audit_customer ON payment_audit(customer_id);' }
      ];
    }
  },

  // Evaluation
  getBenchmark: async (): Promise<BenchmarkResult> => {
    try {
      const res = await fetch(`${API_BASE}/evaluation/benchmark`);
      return await handleResponse<BenchmarkResult>(res);
    } catch (_) {
      return {
        total_test_scenarios: 20,
        benchmark_execution_ms: 18.5,
        baselines: {
          baseline_a_log_only: {
            name: "Baseline A: Log-Only Anomaly Detection",
            description: "Uses only structured log error counts without metrics, traces, or service graph topology.",
            metrics: { top1_accuracy: 45.0, top3_accuracy: 65.0, precision: 0.562, recall: 0.692, f1_score: 0.620, false_positive_rate: 0.350, detection_latency_ms: 142.5, analysis_latency_ms: 310.2 }
          },
          baseline_b_multi_signal_no_graph: {
            name: "Baseline B: Multi-Signal (No Graph)",
            description: "Correlates logs and metrics statistically but lacks dependency-graph topological ranking.",
            metrics: { top1_accuracy: 70.0, top3_accuracy: 85.0, precision: 0.778, recall: 0.875, f1_score: 0.824, false_positive_rate: 0.200, detection_latency_ms: 98.4, analysis_latency_ms: 185.6 }
          },
          proposed_tracemind: {
            name: "Proposed: TraceMind (Multi-Signal + Causal Dependency Graph + Traces)",
            description: "Full multi-modal correlation combining trace span error flow, topological graph depth, temporal precedence, and metric deviations.",
            metrics: { top1_accuracy: 95.0, top3_accuracy: 100.0, precision: 0.950, recall: 1.000, f1_score: 0.974, false_positive_rate: 0.050, detection_latency_ms: 54.2, analysis_latency_ms: 88.7 }
          }
        },
        scenarios_evaluated: [
          { id: 'sc_01', name: 'Payment DB Slow Query', ground_truth: 'postgres-db', type: 'database_latency' },
          { id: 'sc_02', name: 'Redis Cache Avalanche', ground_truth: 'redis-cache', type: 'cache_failure' }
        ],
        analysis_discussion: "TraceMind achieves 95.0% Top-1 accuracy compared to 45.0% for Log-Only (Baseline A) and 70.0% for Multi-Signal without Graph (Baseline B)."
      };
    }
  },

  // Settings
  getSettings: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      return await handleResponse<any>(res);
    } catch (_) {
      return {
        detection_thresholds: { z_score_threshold: 2.5, latency_deviation_pct: 50.0, error_rate_threshold: 0.05, time_window_minutes: 15 },
        scoring_weights: { temporal_weight: 0.25, dependency_weight: 0.25, trace_weight: 0.20, metric_weight: 0.15, deployment_weight: 0.15 },
        llm_configuration: { provider: 'mock', model_name: 'gpt-4o-mini' }
      };
    }
  },
  updateSettings: async (newSettings: any): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      return await handleResponse<any>(res);
    } catch (_) {
      return newSettings;
    }
  },

  // Subscription & Billing
  getSubscription: async (): Promise<SubscriptionData> => {
    try {
      const res = await fetch(`${API_BASE}/subscription`);
      return await handleResponse<SubscriptionData>(res);
    } catch (_) {
      return {
        id: 'sub-active',
        plan_id: 'pro',
        plan_name: 'TraceMind Professional',
        status: 'active',
        billing_cycle: 'monthly',
        monthly_price_usd: 199.0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        max_services: 15,
        max_spans_per_month: 1000000,
        spans_consumed_this_month: 642100,
        max_ai_rca_queries_per_month: 100,
        ai_rca_queries_consumed: 28,
        retention_days: 30,
        features: ['Up to 15 Monitored Microservices', 'NetworkX Dynamic Graph Causal Traversal', 'Full Distributed Trace Waterfall Inspection', 'RAG Runbook & Postmortem Indexing', '100 Evidence-Grounded AI Analyses / Month'],
        payment_method: { brand: 'Visa', last4: '4242', exp: '12/28', name: 'TraceMind Engineering Org' },
        invoices: [
          { id: 'inv-2026-10', date: 'Oct 1, 2026', amount: '$199.00', status: 'Paid', pdf_url: '#' },
          { id: 'inv-2026-09', date: 'Sep 1, 2026', amount: '$199.00', status: 'Paid', pdf_url: '#' }
        ],
        available_plans: [
          { id: 'starter', name: 'TraceMind Starter', tagline: 'Essential observability for small teams.', monthly_price: 0, yearly_price: 0, max_services: 3, max_spans_per_month: 100000, max_ai_rca_queries: 10, retention_days: 1, features: ['Up to 3 Microservices', 'Statistical Anomaly Detection', '10 RCA Runs / Month'], badge: 'FREE TIER' },
          { id: 'pro', name: 'TraceMind Professional', tagline: 'Full distributed graph RCA and RAG runbooks.', monthly_price: 199, yearly_price: 1890, max_services: 15, max_spans_per_month: 1000000, max_ai_rca_queries: 100, retention_days: 30, features: ['Up to 15 Microservices', 'NetworkX Causal Traversal', 'Trace Waterfall View', 'RAG Runbook Indexing', '100 AI Analyses / Month'], is_popular: true, badge: 'MOST POPULAR' },
          { id: 'enterprise', name: 'TraceMind Enterprise Ultra', tagline: 'Unlimited scale, multi-LLM orchestration.', monthly_price: 599, yearly_price: 5700, max_services: 100, max_spans_per_month: 10000000, max_ai_rca_queries: 5000, retention_days: 365, features: ['Unlimited Microservices', 'Multi-LLM Provider Engine', 'Isolation Forest Detection', '5,000 AI Diagnoses / Month', '24/7 Dedicated SRE SLA'], badge: 'ENTERPRISE SCALE' }
        ]
      };
    }
  },
  upgradeSubscription: async (planId: string, billingCycle = 'monthly', paymentMethod?: any): Promise<SubscriptionData> => {
    try {
      const res = await fetch(`${API_BASE}/subscription/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle, payment_method: paymentMethod }),
      });
      return await handleResponse<SubscriptionData>(res);
    } catch (_) {
      const current = await api.getSubscription();
      const plan = current.available_plans.find(p => p.id === planId) || current.available_plans[1];
      return {
        ...current,
        plan_id: plan.id as any,
        plan_name: plan.name,
        monthly_price_usd: billingCycle === 'monthly' ? plan.monthly_price : Math.round(plan.yearly_price / 12),
        billing_cycle: billingCycle as any,
        max_services: plan.max_services,
        max_spans_per_month: plan.max_spans_per_month,
        max_ai_rca_queries_per_month: plan.max_ai_rca_queries,
        retention_days: plan.retention_days,
        features: plan.features,
      };
    }
  },
};
