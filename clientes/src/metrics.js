/**
 * Módulo de métricas e logging para monitoramento
 * Fornece middleware de logging de requisições e endpoint /metrics
 */

class MetricsCollector {
  constructor(serviceName = "service") {
    this.serviceName = serviceName;
    this.startTime = Date.now();
    
    // Contadores gerais
    this.totalRequests = 0;
    this.totalErrors = 0;
    
    // Contadores por método HTTP
    this.requestsByMethod = {
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
      OPTIONS: 0,
    };
    
    // Contadores por status code
    this.requestsByStatus = {};
    
    // Contadores por rota
    this.requestsByRoute = {};
    
    // Métricas de tempo de resposta
    this.responseTimes = [];
    this.maxResponseTime = 0;
    this.minResponseTime = Infinity;
  }

  /**
   * Registra uma requisição
   */
  recordRequest(method, route, statusCode, responseTime) {
    this.totalRequests++;
    
    // Contador por método
    if (this.requestsByMethod[method] !== undefined) {
      this.requestsByMethod[method]++;
    }
    
    // Contador por status
    const statusKey = `${statusCode}`;
    this.requestsByStatus[statusKey] = (this.requestsByStatus[statusKey] || 0) + 1;
    
    // Contador por rota (normalizada)
    const normalizedRoute = this.normalizeRoute(route);
    this.requestsByRoute[normalizedRoute] = (this.requestsByRoute[normalizedRoute] || 0) + 1;
    
    // Métricas de tempo de resposta
    if (responseTime !== undefined) {
      this.responseTimes.push(responseTime);
      if (responseTime > this.maxResponseTime) {
        this.maxResponseTime = responseTime;
      }
      if (responseTime < this.minResponseTime) {
        this.minResponseTime = responseTime;
      }
      // Mantém apenas os últimos 1000 tempos para cálculo de média
      if (this.responseTimes.length > 1000) {
        this.responseTimes.shift();
      }
    }
    
    // Contador de erros (4xx e 5xx)
    if (statusCode >= 400) {
      this.totalErrors++;
    }
  }

  /**
   * Normaliza rotas para agrupar rotas dinâmicas (ex: /restaurantes/:id -> /restaurantes/:id)
   */
  normalizeRoute(route) {
    // Remove query strings
    const path = route.split('?')[0];
    // Normaliza IDs numéricos para :id
    return path.replace(/\/\d+/g, '/:id');
  }

  /**
   * Calcula tempo médio de resposta
   */
  getAverageResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  /**
   * Calcula tempo médio de resposta (últimos N)
   */
  getRecentAverageResponseTime(n = 100) {
    const recent = this.responseTimes.slice(-n);
    if (recent.length === 0) return 0;
    const sum = recent.reduce((a, b) => a + b, 0);
    return Math.round(sum / recent.length);
  }

  /**
   * Retorna métricas em formato JSON
   */
  getMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const avgResponseTime = this.getAverageResponseTime();
    const recentAvgResponseTime = this.getRecentAverageResponseTime(100);
    
    return {
      service: this.serviceName,
      uptime_seconds: uptime,
      requests: {
        total: this.totalRequests,
        errors: this.totalErrors,
        by_method: this.requestsByMethod,
        by_status: this.requestsByStatus,
        by_route: this.requestsByRoute,
      },
      response_time: {
        average_ms: avgResponseTime,
        recent_average_ms: recentAvgResponseTime,
        min_ms: this.minResponseTime === Infinity ? 0 : this.minResponseTime,
        max_ms: this.maxResponseTime,
        samples: this.responseTimes.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retorna métricas em formato Prometheus-like (text/plain)
   */
  getMetricsPrometheus() {
    const metrics = this.getMetrics();
    const lines = [];
    
    // Informações do serviço
    lines.push(`# HELP service_info Service information`);
    lines.push(`# TYPE service_info gauge`);
    lines.push(`service_info{service="${metrics.service}"} 1`);
    
    // Uptime
    lines.push(`# HELP service_uptime_seconds Service uptime in seconds`);
    lines.push(`# TYPE service_uptime_seconds gauge`);
    lines.push(`service_uptime_seconds{service="${metrics.service}"} ${metrics.uptime_seconds}`);
    
    // Total de requisições
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(`http_requests_total{service="${metrics.service}"} ${metrics.requests.total}`);
    
    // Total de erros
    lines.push(`# HELP http_requests_errors_total Total number of HTTP error requests`);
    lines.push(`# TYPE http_requests_errors_total counter`);
    lines.push(`http_requests_errors_total{service="${metrics.service}"} ${metrics.requests.errors}`);
    
    // Requisições por método
    lines.push(`# HELP http_requests_by_method Total requests by HTTP method`);
    lines.push(`# TYPE http_requests_by_method counter`);
    for (const [method, count] of Object.entries(metrics.requests.by_method)) {
      lines.push(`http_requests_by_method{service="${metrics.service}",method="${method}"} ${count}`);
    }
    
    // Requisições por status
    lines.push(`# HELP http_requests_by_status Total requests by HTTP status code`);
    lines.push(`# TYPE http_requests_by_status counter`);
    for (const [status, count] of Object.entries(metrics.requests.by_status)) {
      lines.push(`http_requests_by_status{service="${metrics.service}",status="${status}"} ${count}`);
    }
    
    // Tempo de resposta
    lines.push(`# HELP http_response_time_average_ms Average response time in milliseconds`);
    lines.push(`# TYPE http_response_time_average_ms gauge`);
    lines.push(`http_response_time_average_ms{service="${metrics.service}"} ${metrics.response_time.average_ms}`);
    
    lines.push(`# HELP http_response_time_max_ms Maximum response time in milliseconds`);
    lines.push(`# TYPE http_response_time_max_ms gauge`);
    lines.push(`http_response_time_max_ms{service="${metrics.service}"} ${metrics.response_time.max_ms}`);
    
    lines.push(`# HELP http_response_time_min_ms Minimum response time in milliseconds`);
    lines.push(`# TYPE http_response_time_min_ms gauge`);
    lines.push(`http_response_time_min_ms{service="${metrics.service}"} ${metrics.response_time.min_ms}`);
    
    return lines.join('\n');
  }
}

/**
 * Middleware de logging de requisições
 */
function createLoggingMiddleware(metricsCollector) {
  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Captura o status code e tempo de resposta
    res.send = function (body) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      const method = req.method;
      const route = req.originalUrl || req.url;
      
      // Registra a métrica
      metricsCollector.recordRequest(method, route, statusCode, responseTime);
      
      // Log estruturado
      const logData = {
        timestamp: new Date().toISOString(),
        method,
        route,
        statusCode,
        responseTimeMs: responseTime,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || 'unknown',
      };
      
      // Log formatado para console
      const logLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
      console.log(
        `[${logLevel}] ${method} ${route} ${statusCode} ${responseTime}ms - ${logData.ip}`
      );
      
      // Para requisições de erro, log mais detalhado
      if (statusCode >= 400) {
        console.error(`[REQUEST_ERROR]`, JSON.stringify(logData, null, 2));
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Cria o endpoint /metrics
 */
function createMetricsEndpoint(metricsCollector, format = 'json') {
  return (req, res) => {
    const acceptHeader = req.headers.accept || '';
    const queryFormat = req.query.format || format;
    
    // Se o cliente aceita text/plain ou pediu prometheus, retorna formato Prometheus
    if (queryFormat === 'prometheus' || acceptHeader.includes('text/plain')) {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(metricsCollector.getMetricsPrometheus());
    } else {
      // Caso contrário, retorna JSON
      res.setHeader('Content-Type', 'application/json');
      res.json(metricsCollector.getMetrics());
    }
  };
}

module.exports = {
  MetricsCollector,
  createLoggingMiddleware,
  createMetricsEndpoint,
};

