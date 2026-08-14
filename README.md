# Operaon Equipment & Maintenance

Standalone responsável por ativos físicos, QR Code, locação por horas, retirada/devolução, inspeção e manutenção. O serviço possui banco próprio e foi desenhado para trabalhar com Catalog, Agend, Entitlements / Session Credits, Billing e Pay sem duplicar o ledger de créditos nem as faturas.

## Responsabilidade de cada módulo

| Módulo | Responsabilidade |
| --- | --- |
| **Equipment & Maintenance** | Ativo, número de série, QR Code, disponibilidade, sessão de locação, tempo real, inspeção e manutenção |
| **Catalog** | Pacote, horas incluídas, quantidade máxima de sessões, preço e taxa de excedente |
| **Agend** | Reserva de janela e ponto de coleta/devolução |
| **Entitlements / Session Credits** | Concessão, retenção, débito, liberação e estorno de créditos de sessões |
| **Billing** | Item de excedente, dano, perda de acessório e demais valores faturáveis |
| **Pay** | Autorização, captura, cobrança e estorno financeiro |

O Entitlements atual opera com créditos inteiros de sessão. Por isso, este serviço utiliza uma unidade de crédito por retirada/check-in e mantém os minutos incluídos como snapshot comercial do contrato. O tempo real, os minutos incluídos utilizados e o excedente são fatos operacionais registrados pelo Equipment e valores financeiros encaminhados ao Billing.

## Jornada principal

1. O Catalog define o plano e a contratação cria um contrato local referenciando o `entitlementId`.
2. O tenant reserva o equipamento e a janela de retirada no Agend.
3. O operador escaneia o QR Code no ponto de coleta. O serviço valida tenant, número de série, token do QR Code, contrato, reserva e disponibilidade.
4. O Equipment solicita ao Entitlements a retenção de uma sessão e registra `pickupCheckInAt` usando o relógio do servidor.
5. Na devolução, o QR Code é validado novamente. O serviço registra `returnCheckOutAt`, calcula minutos utilizados, solicita o débito da sessão e registra inspeção de retorno.
6. O excedente é calculado com base no snapshot do contrato. Billing recebe um item separado e Pay processa a cobrança conforme `PREPAID` ou `POSTPAID`.
7. Equipamentos com dano, falha ou peça ausente entram em `QUARANTINED` e não podem ser reservados até a conclusão das ordens de manutenção.

Todas as mutações importantes são idempotentes. O serviço não apaga movimentos de crédito, sessões ou cobranças; correções devem ser feitas por estorno, ajuste ou novo lançamento referenciado ao evento original.

## Endpoints

As rotas de negócio ficam em `/api/equipment` e exigem simultaneamente `X-Service-Key`, JWT de acesso do Identity, contexto de tenant e uma permissão dinâmica.

| Método | Rota | Permissão | Finalidade |
| --- | --- | --- | --- |
| `POST` | `/assets` | `equipment:write` | Criar ativo e QR Code |
| `GET` | `/assets` | `equipment:read` | Listar ativos |
| `GET` | `/assets/:id` | `equipment:read` | Consultar ativo |
| `PATCH` | `/assets/:id` | `equipment:write` | Atualizar ativo |
| `GET` | `/assets/:id/qr` | `equipment:read` | Obter payload do QR Code |
| `GET` | `/assets/:id/qr.png` | `equipment:read` | Baixar QR Code PNG para impressão |
| `GET` | `/assets/qr/:serialNumber` | `equipment:read` | Resolver ativo por série e token |
| `POST` | `/contracts` | `equipment:write` | Criar contrato operacional |
| `GET` | `/contracts` | `equipment:read` | Listar contratos |
| `POST` | `/reservations` | `equipment:write` | Criar reserva ligada ao Agend |
| `GET` | `/reservations` | `equipment:read` | Listar reservas |
| `POST` | `/sessions/check-in` | `equipment:write` | Registrar retirada e iniciar contagem |
| `GET` | `/sessions` | `equipment:read` | Listar sessões |
| `GET` | `/sessions/:id` | `equipment:read` | Consultar sessão |
| `POST` | `/sessions/:id/check-out` | `equipment:write` | Registrar devolução e encerrar contagem |
| `POST` | `/maintenance/orders` | `equipment:admin` | Abrir manutenção |
| `GET` | `/maintenance/orders` | `equipment:read` | Listar manutenções |
| `POST` | `/maintenance/orders/:id/start` | `equipment:admin` | Iniciar manutenção |
| `POST` | `/maintenance/orders/:id/complete` | `equipment:admin` | Concluir manutenção |
| `POST` | `/maintenance/orders/:id/cancel` | `equipment:admin` | Cancelar manutenção |

## Excedente

O contrato congela `includedMinutes`, `maxSessions`, `overtimeRateCents` e `currency`. No check-out, o cálculo é:

```text
minutesUsed = ceil((returnCheckOutAt - pickupCheckInAt) / 60 segundos)
includedMinutesUsed = min(minutesUsed, minutesRemainingInContract)
overageMinutes = max(minutesUsed - minutesRemainingInContract, 0)
billableOverageMinutes = ceil(overageMinutes / roundingUnit) * roundingUnit
overageAmountCents = ceil(billableOverageMinutes / 60 * overtimeRateCents)
```

O pré-pago exige pagamento confirmado para ativar o contrato e deve possuir um método de pagamento válido para o excedente. O pós-pago trabalha com limite aprovado, mas não é ilimitado: a operação deve impor limites de crédito e de sessões no Billing/Pay. Se o pagamento adicional for recusado, a sessão é encerrada como `COMPLETED_WITH_DEBT` e o débito é preservado para cobrança posterior.

## Banco e migrations

O serviço usa o banco `operaon_equipment` no ambiente local e `operaon_equipment_test` nos testes. A migration inicial cria `equipment_assets`, `rental_contracts`, `equipment_reservations`, `rental_sessions`, `rental_usage_records`, `equipment_inspections` e `equipment_maintenance_orders`, com índices de tenant, janela de reserva e idempotência.

```bash
npm install
npm run migrate
npm test
```

A porta local é `4780`, evitando conflito com Entitlements, que usa `4770`. O modo `INTEGRATION_MODE=mock` está disponível somente para desenvolvimento/testes locais; em implantação deve ser usado `INTEGRATION_MODE=live`.

## Implantação

Copie `.env.example` para o ambiente de implantação e configure credenciais por secret manager. Não use o `.env` local em produção. Os endpoints de Entitlements, Catalog, Agend, Billing e Pay devem ser acessíveis pela rede privada, e o JWT recebido deve ser aceito pelo Identity com `issuer`, `audience` e algoritmo compatíveis.

```bash
NODE_ENV=production npm run migrate
NODE_ENV=production npm start
```

Health checks: `GET /health` não exige autenticação; `GET /ready` testa a conexão com o banco. A aplicação encerra de forma controlada em `SIGTERM` e fecha o pool do Sequelize antes de finalizar.
