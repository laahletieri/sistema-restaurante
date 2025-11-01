const axios = require("axios");

class Bully {
  constructor({ id, nodes, onCoordinatorChange }) {
    this.id = id; // ID único deste nó
    this.nodes = nodes; // Lista de nós participantes
    this.onCoordinatorChange = onCoordinatorChange; // Callback para mudanças de coordenador
    this.coordinator = null; // { id, url }
    this.selfUrl = null; // URL deste nó
    this.electionInProgress = false;
  }

  setSelfUrl(url) {
    this.selfUrl = url;
  }

  async start() {
    console.log(`[BULLY:${this.id}] Iniciando...`);
    await this.checkCoordinatorLoop();
  }

  // Loop de verificação periódica do coordenador

  async checkCoordinatorLoop() {
    while (true) {
      console.log(`[BULLY:${this.id}] Loop de verificação ativo...`);
      try {
        if (!this.coordinator || this.coordinator.id === this.id) {
          // Se não há coordenador ou este nó é o coordenador, apenas aguarda
          await this.sleep(5000);
          continue;
        }

        const healthy = await this.pingCoordinator();

        if (!healthy) {
          console.log(`[BULLY:${this.id}] Coordenador inativo detectado.`);
          await this.startElection();
        }
      } catch (err) {
        console.error(
          `[BULLY:${this.id}] Erro no loop de verificação:`,
          err.message
        );
      }

      await this.sleep(5000);
    }
  }

  async pingCoordinator() {
    try {
      const res = await axios.get(`${this.coordinator.url}/heartbeat`, {
        timeout: 2000,
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  // Inicia um processo de eleição
  async startElection() {
    if (this.electionInProgress) return;
    this.electionInProgress = true;

    console.log(`[BULLY:${this.id}] Iniciando eleição.`);

    const higherNodes = this.nodes.filter((n) => n.id > this.id);
    if (higherNodes.length === 0) {
      // Nenhum nó com ID maior — este torna-se coordenador
      console.log(
        `[BULLY:${this.id}] Sou o maior nó ativo. Tornando-me coordenador.`
      );
      await this.announceCoordinator();
      this.electionInProgress = false;
      return;
    }

    let higherResponded = false;

    for (const node of higherNodes) {
      try {
        await axios.post(`${node.url}/election`, {
          id: this.id,
          url: this.selfUrl,
        });
        console.log(
          `[BULLY:${this.id}] Solicitação de eleição enviada para nó ${node.id}`
        );
        higherResponded = true;
      } catch (err) {
        console.log(
          `[BULLY:${this.id}] Falha ao contatar nó ${node.id} (${node.url}): ${err.message}`
        );
      }
    }

    if (!higherResponded) {
      // Nenhum nó com ID maior respondeu → este nó vence
      console.log(
        `[BULLY:${this.id}] Nenhum nó com ID maior respondeu. Tornando-me coordenador.`
      );
      await this.announceCoordinator();
    }

    this.electionInProgress = false;
  }

  // Manipula uma solicitação de eleição recebida
  async handleElectionRequest(senderId, senderUrl) {
    console.log(`[BULLY:${this.id}] Recebida eleição de nó ${senderId}.`);

    // Responde com ACK apenas se este nó tiver ID maior
    if (this.id > senderId) {
      try {
        await axios.post(`${senderUrl}/coordinator`, {
          id: this.id,
          url: this.selfUrl,
        });
        console.log(
          `[BULLY:${this.id}] Informei nó ${senderId} que sou maior.`
        );
        await this.startElection();
      } catch (err) {
        console.log(
          `[BULLY:${this.id}] Falha ao responder eleição de ${senderId}:`,
          err.message
        );
      }
    } else {
      console.log(`[BULLY:${this.id}] Ignorando eleição de nó maior.`);
    }
  }

  // Quando um nó se declara coordenador
  async handleCoordinatorAnnouncement(id, url) {
    this.coordinator = { id, url };
    console.log(
      `[BULLY:${this.id}] Novo coordenador reconhecido: ${id} (${url})`
    );
    if (this.onCoordinatorChange) {
      this.onCoordinatorChange(id, url);
    }
  }

  // Este nó anuncia que é o coordenador
  async announceCoordinator() {
    this.coordinator = { id: this.id, url: this.selfUrl };

    for (const node of this.nodes) {
      if (node.id === this.id) continue;
      try {
        await axios.post(`${node.url}/coordinator`, {
          id: this.id,
          url: this.selfUrl,
        });
      } catch (err) {
        console.log(
          `[BULLY:${this.id}] Falha ao notificar nó ${node.id}:`,
          err.message
        );
      }
    }

    if (this.onCoordinatorChange) {
      this.onCoordinatorChange(this.id, this.selfUrl);
    }
  }

  // Função auxiliar de espera
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = Bully;
