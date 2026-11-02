import { consumptionHistory } from '../data/ResidentConsumptionData'
import './ResidentHistoryPage.css'

function ResidentHistoryPage() {
    const totalConsumption = consumptionHistory.reduce(
        (total, item) => total + item.consumption,
        0,
    )

    return (
        <div className="resident-history">
            <header className="resident-history__heading">
                <div>
                    <span className="resident-history__eyebrow">
                        ÁREA DO MORADOR / HISTÓRICO
                    </span>
                    <h1>Histórico de consumo</h1>
                    <p>Consulte as leituras e o consumo registrado na sua unidade.</p>
                </div>
                <span className="resident-history__demo">Dados simulados</span>
            </header>

            <section className="resident-history__summary">
                <article>
                    <span>Registros disponíveis</span>
                    <strong>{consumptionHistory.length}</strong>
                    <small>Leituras registradas</small>
                </article>

                <article>
                    <span>Consumo acumulado</span>
                    <strong>{totalConsumption.toFixed(1).replace('.', ',')} m³</strong>
                    <small>Soma dos períodos exibidos</small>
                </article>

                <article>
                    <span>Última leitura</span>
                    <strong>{consumptionHistory[0]?.date ?? '—'}</strong>
                    <small>Registro mais recente</small>
                </article>
            </section>

            <section className="resident-history__panel">
                <div className="resident-history__panel-heading">
                    <div>
                        <h2>Leituras registradas</h2>
                        <p>Histórico de consumo da unidade consumidora.</p>
                    </div>
                </div>

                <div className="resident-history__table-wrapper">
                    <table className="resident-history__table">
                        <thead>
                            <tr>
                                <th>Identificação</th>
                                <th>Data</th>
                                <th>Leitura do hidrômetro</th>
                                <th>Consumo do período</th>
                                <th>Situação</th>
                            </tr>
                        </thead>

                        <tbody>
                            {consumptionHistory.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.date}</td>
                                    <td>{item.reading.toFixed(1).replace('.', ',')} m³</td>
                                    <td>{item.consumption.toFixed(1).replace('.', ',')} m³</td>
                                    <td>
                                        <span
                                            className={`resident-history__status resident-history__status--${item.status.toLowerCase()}`}
                                        >
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="resident-history__disclaimer">
                Dados fictícios para demonstração. As leituras reais serão fornecidas
                pela API do sistema.
            </p>
        </div>
    )
}

export default ResidentHistoryPage