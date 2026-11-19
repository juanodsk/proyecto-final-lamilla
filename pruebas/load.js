import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.BASE_URL || 'http://localhost:8080';
const profile = __ENV.PROFILE || 'load';
if (!['load', 'stress'].includes(profile)) throw new Error('PROFILE debe ser load o stress');
const stress = profile === 'stress';

export const options = {
  stages: stress
    ? [{ duration: '5s', target: 30 }, { duration: '8s', target: 100 }, { duration: '10s', target: 100 }, { duration: '5s', target: 0 }]
    : [{ duration: '5s', target: 20 }, { duration: '15s', target: 20 }, { duration: '5s', target: 0 }],
  thresholds: {
    'http_req_duration{operation:list}': ['p(95)<' + (stress ? 1000 : 400)],
    'http_req_failed{operation:list}': ['rate<' + (stress ? 0.05 : 0.01)],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const response = http.post(base + '/api/auth/login', JSON.stringify({
    email: 'agente@proyectofinal.test', password: 'LamillaDemo2026!',
  }), { headers: { 'Content-Type': 'application/json' } });
  if (response.status !== 200) throw new Error('El perfil de carga necesita DEMO_SEED=true.');
  return { token: response.json('token') };
}

export default function ({ token }) {
  const result = http.get(base + '/api/tickets?page=1', {
    headers: { Authorization: 'Bearer ' + token },
    tags: { operation: 'list' },
  });
  check(result, { 'lista HTTP 200': response => response.status === 200 });
  sleep(0.2);
}

export function handleSummary(data) {
  const duration = data.metrics['http_req_duration{operation:list}'];
  const failed = data.metrics['http_req_failed{operation:list}'];
  const output = {
    date: new Date().toISOString(), profile, endpoint: 'GET /api/tickets?page=1',
    maxVus: stress ? 100 : 20,
    samples: data.metrics.checks?.values?.passes + data.metrics.checks?.values?.fails,
    elapsedMs: data.state.testRunDurationMs,
    duration: duration?.values,
    errorRate: failed?.values?.rate,
    thresholds: { ...duration?.thresholds, ...failed?.thresholds, ...data.metrics.checks?.thresholds },
  };
  const target = (__ENV.RESULT_DIR || '/results') + '/' + profile + '.json';
  return { [target]: JSON.stringify(output, null, 2), stdout: JSON.stringify(output, null, 2) + '\n' };
}
