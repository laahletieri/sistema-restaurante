const NAME_SERVICE_URL = import.meta.env.VITE_NOMEACAO_URL;

const cache = {};

/**
 * Busca a URL base de um serviço no microserviço de nomeação.
 * Ex: "clientes" -> "http://clientes-env....elasticbeanstalk.com"
 */
export async function getServiceUrl(serviceName) {
  if (!NAME_SERVICE_URL) {
    throw new Error("VITE_NOMEACAO_URL não configurada no .env");
  }

  if (cache[serviceName]) {
    return cache[serviceName];
  }

  const res = await fetch(`${NAME_SERVICE_URL}/resolve/${serviceName}`);
  if (!res.ok) {
    throw new Error(
      `Falha ao resolver serviço '${serviceName}': ${res.status}`
    );
  }

  const data = await res.json();
  cache[serviceName] = data.url;
  return data.url;
}
