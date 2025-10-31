# Serviço de Replicação de Dados

Este serviço é responsável por replicar as reservas do banco de dados principal para uma segunda instância (réplica), simulando um sistema distribuído com replicação de dados.

## 📋 Funcionalidades

- ✅ Replicação automática por polling (verificação periódica)
- ✅ Replicação em tempo real via webhook (push)
- ✅ Sincronização manual sob demanda
- ✅ Monitoramento de status da replicação
- ✅ Tratamento de falhas e recuperação automática

## 🚀 Como Usar

### Executar com Docker Compose

O serviço já está configurado no `docker-compose.yml`. Para iniciar:

```bash
docker-compose up replicacao
```

### Executar Localmente

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
# Banco Principal
export DB_PRINCIPAL_HOST=localhost
export DB_PRINCIPAL_USER=root
export DB_PRINCIPAL_PASS=password
export DB_PRINCIPAL_NAME=reservas_db

# Banco Réplica
export DB_REPLICA_HOST=localhost
export DB_REPLICA_USER=root
export DB_REPLICA_PASS=password
export DB_REPLICA_NAME=reservas_db_replica

# Intervalo de polling (ms) - padrão: 30000 (30 segundos)
export INTERVALO_REPLICACAO=30000
```

3. Execute o serviço:
```bash
npm start
```

## 📡 Endpoints da API

### 1. Status da Replicação
```http
GET /replicacao/status
```

Retorna informações sobre o estado da replicação:
```json
{
  "ultima_sincronizacao": "2024-01-15T10:30:00Z",
  "ultima_reserva_id": 42,
  "total_replicadas": 150,
  "total_principal": 152,
  "total_replica": 150,
  "diferenca": 2
}
```

### 2. Sincronização Manual
```http
POST /replicacao/sincronizar
```

Força uma sincronização imediata de todas as reservas pendentes.

### 3. Replicar Reserva Específica
```http
POST /replicacao/reserva/:id
```

Replica uma reserva específica por ID (usado pelo serviço principal via webhook).

### 4. Listar Reservas da Réplica
```http
GET /replicacao/reservas
```

Lista todas as reservas replicadas.

### 5. Health Check
```http
GET /health
```

Verifica se o serviço está ativo.

## 🔄 Como Funciona

### Replicação Automática (Polling)

O serviço verifica automaticamente a cada 30 segundos (configurável) por novas reservas no banco principal e as replica para o banco réplica.

### Replicação em Tempo Real (Push)

Quando uma nova reserva é criada no serviço principal, uma notificação é enviada para este serviço para replicação imediata. Se a notificação falhar, a replicação ocorrerá automaticamente via polling.

## 📊 Monitoramento

Use o endpoint `/replicacao/status` para monitorar:
- Número de reservas replicadas
- Diferença entre principal e réplica
- Última sincronização realizada

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_PRINCIPAL_HOST` | Host do banco principal | `process.env.DB_HOST` |
| `DB_PRINCIPAL_USER` | Usuário do banco principal | `process.env.DB_USER` |
| `DB_PRINCIPAL_PASS` | Senha do banco principal | `process.env.DB_PASS` |
| `DB_PRINCIPAL_NAME` | Nome do banco principal | `process.env.DB_NAME` |
| `DB_REPLICA_HOST` | Host do banco réplica | `process.env.DB_HOST` |
| `DB_REPLICA_USER` | Usuário do banco réplica | `process.env.DB_USER` |
| `DB_REPLICA_PASS` | Senha do banco réplica | `process.env.DB_PASS` |
| `DB_REPLICA_NAME` | Nome do banco réplica | `process.env.DB_NAME + '_replica'` |
| `INTERVALO_REPLICACAO` | Intervalo de polling em ms | `30000` |
| `PORT` | Porta do serviço | `3002` |

## 📐 Modelo de Consistência

### Consistência Eventual (Eventual Consistency)

Este serviço implementa o modelo de **Consistência Eventual**, amplamente utilizado em sistemas distribuídos. Este modelo oferece um equilíbrio entre disponibilidade, desempenho e consistência.

#### Características

- **Consistência Eventual**: Na ausência de novas atualizações, todas as réplicas eventualmente convergirão para o mesmo estado
- **Alta Disponibilidade**: O sistema continua operando mesmo quando algumas réplicas estão temporariamente indisponíveis
- **Tolerância a Particionamento**: O sistema pode continuar operando durante partições de rede

#### Trade-offs

**Vantagens:**
- ✅ Alta disponibilidade
- ✅ Melhor desempenho (baixa latência de escrita)
- ✅ Tolerância a falhas de rede
- ✅ Escalabilidade horizontal

**Desvantagens:**
- ⚠️ Pode haver inconsistências temporárias entre réplicas (até 30 segundos)
- ⚠️ Leitura pode retornar dados "stale" (desatualizados) por um curto período

#### Estratégias de Replicação

1. **Push (Tempo Real)**: Quando uma reserva é criada, uma notificação é enviada ao serviço de replicação para replicação imediata
2. **Polling (Assíncrono)**: Verificação periódica (a cada 30 segundos) por novas reservas que não foram replicadas, garantindo sincronização eventual mesmo após falhas

## 📝 Notas Importantes

- A replicação usa **Consistência Eventual**: a réplica pode estar ligeiramente desatualizada (até 30 segundos)
- O banco principal é sempre a **fonte de verdade**
- Falhas na replicação não afetam o serviço principal
- O serviço automaticamente recupera reservas perdidas em caso de falha
- A combinação de push + polling garante replicação rápida quando possível e eventual sincronização sempre

## 🔍 Logs

O serviço exibe logs informativos:
- ✅ Reserva replicada com sucesso
- 🔄 Processamento de replicação
- ⚠️ Avisos de falhas (não bloqueantes)
- ❌ Erros críticos

