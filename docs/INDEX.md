# Documentação — Equipment & Maintenance

> **Status:** documentação versionada em Docs as Code. **Owner:** Equipment. **Branch:** main.

Este índice organiza a documentação oficial do repositório [Equipment & Maintenance][1]. A documentação global define os padrões; este repositório registra somente responsabilidades, contratos e procedimentos específicos.

## Visão rápida

| Campo | Valor |
| --- | --- |
| Repositório | `equipment` |
| Tipo | module |
| Responsabilidade | Equipamentos, número de série, QR Code, reserva, check-in, check-out, utilização e excedentes. |
| Porta declarada | 4780 |
| Banco próprio | Sim, conforme configuração do serviço |
| Entrada oficial | Gateway ou serviço autorizado |

## Documentos

- [Contrato do módulo](module-contract.md)
- [API e endpoints](api.md)
- [Eventos e integrações](events.md)
- [Segurança](security.md)
- [Operação](operations.md)
- [Testes](testing.md)
- [Runbook de saúde](runbooks/health-and-readiness.md)
- [Decisões arquiteturais](decisions/ADR-0001-documentation-standard.md)

## Princípios

Equipment registra fatos operacionais; Agend é autoridade temporal, Billing é autoridade monetária e Pay processa a cobrança.

A regra de ownership é obrigatória: comandos que alteram estado devem ser enviados ao owner do domínio; eventos informam mudanças após commit; consultas não transferem ownership.

## Referências

[1]: https://github.com/operaon/equipment "Repositório Equipment & Maintenance"
[2]: https://github.com/operaon/api "API Gateway Operaon"
[3]: https://github.com/operaon/identity "Identity Operaon"
