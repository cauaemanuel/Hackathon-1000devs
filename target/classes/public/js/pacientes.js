import { apiBase, utils } from './apiHandlers/api.js';
import { estatisticasModule } from './estatisticas.js';

const TABLE = 'paciente';

export const pacientesModule = {
    async carregarPacientes() {
        const ENDPOINT = 'consultar';
        
        try {
            const pacientes = await apiBase.listar(TABLE, ENDPOINT);
            this.carregarPacientesEStatisticas(pacientes);
        } catch (error) {
            utils.mostrarMensagem('Erro', error.message);
        }
    },

    // Ainda falta tela
    async cadastrarPaciente(event) {
        const ENDPOINT = 'inserir';

        event.preventDefault();
        try {
            const dados = utils.getFormData(event.target);
            await apiBase.cadastrar(TABLE, ENDPOINT, dados);
            utils.mostrarMensagem('Sucesso', 'Paciente cadastrado com sucesso!');
            event.target.reset();
            await this.carregarPacientes();
        } catch (error) {
            utils.mostrarMensagem('Erro', error.message);
        }
    },

    async carregarPacientePorId(id) {
        const ENDPOINT = 'consultar';
    
        if (!id) return;
        
        try {
            const paciente = await apiBase.buscarPorId(TABLE, ENDPOINT, id);
            // Convert single object to array for renderizarTabela
            const pacientes = Array.isArray(paciente) ? paciente : [paciente];
            this.carregarPacientesEStatisticas(pacientes);
        } catch (error) {
            utils.mostrarMensagem('Erro', error.message);
        }
    },

    async atualizarPaciente(event) {
        const ENDPOINT = 'cadastrar';

        event.preventDefault();
        const id = document.getElementById('id').value;
        try {
            const dados = utils.getFormData(event.target);
            await apiBase.atualizar(TABLE, ENDPOINT, id, dados);
            utils.mostrarMensagem('Sucesso', 'Paciente atualizado com sucesso!');
        } catch (error) {
            utils.mostrarMensagem('Erro', error.message);
        }
    },

    async excluirPaciente(id) {
        const ENDPOINT = 'excluir';

        if (!confirm('Deseja realmente excluir este paciente?\n\nSim - OK\nNão - Cancelar')) return;
        
        try {
            await apiBase.excluir(TABLE, ENDPOINT, id);
            utils.mostrarMensagem('Sucesso', 'Paciente excluído com sucesso!');
            await this.carregarPacientesEStatisticas();
        } catch (error) {
            utils.mostrarMensagem('Erro', error.message);
        }
    },

    async carregarPacientesEStatisticas(pacientes) {
        if (!pacientes || !Array.isArray(pacientes)) {
            console.error('Pacientes inválidos:', pacientes);
            return;
        }

    
        try {
            const pacientesComStats = await Promise.all(
                pacientes.map(async paciente => {
                    try {
                        if (!paciente || !paciente.id || !paciente.data_nascimento) {
                            console.error('Dados do paciente inválidos:', paciente);
                            return null;
                        }
    
                        const birthDate = new Date(paciente.data_nascimento);
                        const today = new Date();
                        const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                                        (today.getMonth() - birthDate.getMonth());
    
                        const stats = await estatisticasModule.carregarTodasEstatisticas(paciente.id, ageInMonths);
                        return { paciente, stats };
                    } catch (err) {
                        console.error(`Erro ao processar paciente ${paciente?.id}:`, err);
                        return null;
                    }
                })
            );
    
            const validResults = pacientesComStats.filter(result => result !== null);
            this.renderizarTabela(validResults);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            utils.mostrarMensagem('Erro', 'Erro ao carregar estatísticas');
        }
    },
    
    renderizarTabela(results) {
        const tbody = document.getElementById('resultTable-paciente');
        
        console.log(results);

        tbody.innerHTML = results.map(({ paciente, stats }) => `
            <tr class = "border border-2 border-dark rounded">
                <tr class = "table-primary">
                    <td>${paciente.id && paciente.id !== '' ? paciente.id : '---'}</td>
                    <td>${paciente.nome && paciente.nome !== '' ? paciente.nome : 'Não informado'}</td>
                    <td>${paciente.cpf && paciente.cpf !== '' ? paciente.cpf : '---'}</td>
                    <td>${paciente.sexo && paciente.sexo !== '' ? paciente.sexo : 'Não informado'}</td>
                    <td>${utils.formatarData(paciente.data_nascimento)}</td>
                    <td>
                        <a href="../imunizacao/porPaciente/imunizacaoPaciente.html?id=${paciente.id}">
                            <button class="w3-button w3-green w3-round">Imunizações</button>
                        </a>
                        <a href="../paciente/atualizar/atualizar.html?id=${paciente.id}">
                            <button class="w3-button w3-green w3-round">Editar</button>
                        </a>
                        <button class="w3-button w3-red w3-round excluir-btn" data-id="${paciente.id}">
                            Excluir
                        </button>
                    </td>
                </tr>
                <tr class="table-secondary">
                    <td>Vacinas Tomadas: ${stats?.vacinasPorPaciente?.quantidade || 0}</td>
                    <td>Próximo Mês: ${stats?.vacinasProxMes?.quantidade || 0}</td>
                    <td>Atrasadas: ${stats?.vacinasAtrasadas?.quantidade || 0}</td>
                    <td>Acima da Idade: ${stats?.vacinasAcimaIdade?.quantidade || 0}</td>
                    <td>Não Aplicáveis: ${stats?.vacinasNaoAplicavel?.quantidade || 0}</td>
                    <td></td>
                </tr>
            </tr>
        `).join('');
    },

    preencherFormulario(paciente) {
        Object.keys(paciente).forEach(key => {
            const input = document.getElementById(key);
            if (input) input.value = paciente[key];
        });
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    // Verifica se está na página de listagem

    if (document.getElementById('resultTable-paciente')) {
        pacientesModule.carregarPacientes();
    }

    // Add click event listener
    if (searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            const id = document.getElementById('search-bar').value;
            if (id) {
                pacientesModule.carregarPacientePorId(id);
            }
        });
    }

    // Configura o formulário
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            if (utils.obterParametroUrl('id')) {
                pacientesModule.atualizarPaciente(e);
            } else {
                pacientesModule.cadastrarPaciente(e);
            }
        });
    }

    document.addEventListener('click', (e) => {
            if (e.target.matches('.excluir-btn')) {
                const id = e.target.dataset.id;
                pacientesModule.excluirPaciente(id);
            }
        });
});